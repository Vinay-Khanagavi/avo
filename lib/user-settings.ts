/**
 * Helper functions to get user settings for AI formatting
 */

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// Encryption key - same logic as in route.ts
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
  // Generate a random 32-byte key (for development)
  return crypto.randomBytes(32)
}

const ENCRYPTION_KEY_BUFFER = getEncryptionKey()
const ALGORITHM = 'aes-256-cbc'

function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 2) return ''
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

export interface UserAISettings {
  provider: 'groq' | 'openai' | 'local' | 'none'
  groqApiKey?: string
  openaiApiKey?: string
  ollamaUrl?: string
  detectBulletPoints: boolean
  refineGrammar: boolean
  improvePunctuation: boolean
  improveCapitalization: boolean
  addFormatting: boolean
}

/**
 * Get user AI formatter settings from database
 * Falls back to environment variables if not set
 */
export async function getUserAISettings(): Promise<UserAISettings> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      // Return defaults with env vars as fallback - use env Groq key as default
      return {
        provider: (process.env.AI_FORMATTER_PROVIDER as any) || 'groq',
        groqApiKey: process.env.GROQ_API_KEY || '', // Use env Groq key as default
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        detectBulletPoints: true,
        refineGrammar: true,
        improvePunctuation: true,
        improveCapitalization: true,
        addFormatting: true,
      }
    }

    // Access userSettings - Prisma client has this property after migration
    const settings = await (prisma as any).userSettings.findUnique({
      where: { userId: session.user.id },
    })

    if (!settings) {
      // Return defaults with env vars as fallback - use env Groq key as default
      return {
        provider: (process.env.AI_FORMATTER_PROVIDER as any) || 'groq',
        groqApiKey: process.env.GROQ_API_KEY || '', // Use env Groq key as default
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        detectBulletPoints: true,
        refineGrammar: true,
        improvePunctuation: true,
        improveCapitalization: true,
        addFormatting: true,
      }
    }

    // Decrypt API keys - fallback to env Groq key if user hasn't set their own
    const provider = (settings.aiFormatterProvider as 'groq' | 'openai' | 'local' | 'none') || 
                     (process.env.AI_FORMATTER_PROVIDER as any) || 
                     'groq'

    // Use user's API key if set, otherwise fallback to env Groq key
    const userGroqKey = settings.groqApiKey ? decrypt(settings.groqApiKey) : null
    const userOpenaiKey = settings.openaiApiKey ? decrypt(settings.openaiApiKey) : null

    return {
      provider,
      groqApiKey: userGroqKey || process.env.GROQ_API_KEY || '', // Fallback to env Groq key
      openaiApiKey: userOpenaiKey || process.env.OPENAI_API_KEY || '',
      ollamaUrl: settings.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
      detectBulletPoints: settings.detectBulletPoints,
      refineGrammar: settings.refineGrammar,
      improvePunctuation: settings.improvePunctuation,
      improveCapitalization: settings.improveCapitalization,
      addFormatting: settings.addFormatting,
    }
  } catch (error) {
    console.error('Error fetching user AI settings:', error)
    // Fallback to environment variables - use env Groq key as default
    return {
      provider: (process.env.AI_FORMATTER_PROVIDER as any) || 'groq',
      groqApiKey: process.env.GROQ_API_KEY || '', // Use env Groq key as default
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      detectBulletPoints: true,
      refineGrammar: true,
      improvePunctuation: true,
      improveCapitalization: true,
      addFormatting: true,
    }
  }
}

