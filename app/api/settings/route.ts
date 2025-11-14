import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// Encryption key - in production, use environment variable
// AES-256 requires 32 bytes (64 hex characters)
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (envKey) {
    // If it's a hex string, it should be 64 characters (32 bytes)
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, 'hex')
    }
    // If it's a regular string, hash it to get 32 bytes
    return crypto.createHash('sha256').update(envKey).digest()
  }
  // Generate a random 32-byte key and store it (for development)
  // In production, always set ENCRYPTION_KEY environment variable
  const randomKey = crypto.randomBytes(32)
  console.warn('⚠️  ENCRYPTION_KEY not set! Using random key (settings will be lost on restart). Set ENCRYPTION_KEY in .env for production.')
  return randomKey
}

const ENCRYPTION_KEY_BUFFER = getEncryptionKey()
const ALGORITHM = 'aes-256-cbc'

function encrypt(text: string): string {
  if (!text) return ''
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw error
  }
}

function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 2) {
      console.warn('Invalid encrypted text format')
      return ''
    }
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return ''
  }
}

/**
 * GET /api/settings - Get user settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      const settings = await (prisma as any).userSettings.findUnique({
        where: { userId: session.user.id },
      })

      if (!settings) {
        // Return defaults
        return NextResponse.json({
          aiFormatterProvider: 'groq',
          groqApiKey: '',
          openaiApiKey: '',
          ollamaUrl: 'http://localhost:11434',
          detectBulletPoints: true,
          refineGrammar: true,
          improvePunctuation: true,
          improveCapitalization: true,
          addFormatting: true,
        })
      }

      // Decrypt API keys - return empty string if not set (will use env default)
      const decryptedSettings = {
        aiFormatterProvider: settings.aiFormatterProvider || 'groq',
        groqApiKey: settings.groqApiKey ? decrypt(settings.groqApiKey) : '', // Empty = use env default
        openaiApiKey: settings.openaiApiKey ? decrypt(settings.openaiApiKey) : '',
        ollamaUrl: settings.ollamaUrl || 'http://localhost:11434',
        detectBulletPoints: settings.detectBulletPoints,
        refineGrammar: settings.refineGrammar,
        improvePunctuation: settings.improvePunctuation,
        improveCapitalization: settings.improveCapitalization,
        addFormatting: settings.addFormatting,
      }

      return NextResponse.json(decryptedSettings)
    } catch (dbError: any) {
      // If userSettings table doesn't exist yet, return defaults
      if (dbError?.code === 'P2021' || dbError?.message?.includes('does not exist')) {
        console.warn("UserSettings table not found, returning defaults:", dbError.message)
        return NextResponse.json({
          aiFormatterProvider: 'groq',
          groqApiKey: '',
          openaiApiKey: '',
          ollamaUrl: 'http://localhost:11434',
          detectBulletPoints: true,
          refineGrammar: true,
          improvePunctuation: true,
          improveCapitalization: true,
          addFormatting: true,
        })
      }
      throw dbError
    }
  } catch (error: any) {
    console.error("Error fetching settings:", error)
    const errorMessage = error?.message || error?.toString() || "Unknown error"
    console.error("Full error details:", {
      message: errorMessage,
      stack: error?.stack,
      code: error?.code,
    })
    return NextResponse.json(
      { error: `Failed to fetch settings: ${errorMessage}` },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings - Update user settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      aiFormatterProvider,
      groqApiKey,
      openaiApiKey,
      ollamaUrl,
      detectBulletPoints,
      refineGrammar,
      improvePunctuation,
      improveCapitalization,
      addFormatting,
    } = body

    // Encrypt API keys before storing (only if user provided them)
    // If Groq key is empty, don't store it - will use env default
    const encryptedGroqApiKey = groqApiKey && groqApiKey.trim() ? encrypt(groqApiKey.trim()) : null
    const encryptedOpenaiApiKey = openaiApiKey && openaiApiKey.trim() ? encrypt(openaiApiKey.trim()) : null

    // Upsert settings - using type assertion because Prisma types may not be updated yet
    const settings = await (prisma as any).userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        aiFormatterProvider: aiFormatterProvider || null,
        groqApiKey: encryptedGroqApiKey,
        openaiApiKey: encryptedOpenaiApiKey,
        ollamaUrl: ollamaUrl || null,
        detectBulletPoints: detectBulletPoints !== undefined ? detectBulletPoints : true,
        refineGrammar: refineGrammar !== undefined ? refineGrammar : true,
        improvePunctuation: improvePunctuation !== undefined ? improvePunctuation : true,
        improveCapitalization: improveCapitalization !== undefined ? improveCapitalization : true,
        addFormatting: addFormatting !== undefined ? addFormatting : true,
      },
      create: {
        userId: session.user.id,
        aiFormatterProvider: aiFormatterProvider || 'groq',
        groqApiKey: encryptedGroqApiKey,
        openaiApiKey: encryptedOpenaiApiKey,
        ollamaUrl: ollamaUrl || 'http://localhost:11434',
        detectBulletPoints: detectBulletPoints !== undefined ? detectBulletPoints : true,
        refineGrammar: refineGrammar !== undefined ? refineGrammar : true,
        improvePunctuation: improvePunctuation !== undefined ? improvePunctuation : true,
        improveCapitalization: improveCapitalization !== undefined ? improveCapitalization : true,
        addFormatting: addFormatting !== undefined ? addFormatting : true,
      },
    })

    return NextResponse.json({ 
      success: true,
      message: "Settings saved successfully" 
    })
  } catch (error: any) {
    console.error("Error saving settings:", error)
    const errorMessage = error?.message || error?.toString() || "Unknown error"
    console.error("Full error details:", {
      message: errorMessage,
      stack: error?.stack,
      code: error?.code,
    })
    return NextResponse.json(
      { error: `Failed to save settings: ${errorMessage}` },
      { status: 500 }
    )
  }
}

