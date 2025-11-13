import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const dictionarySchema = z.object({
  word: z.string().min(1, "Word is required"),
  substitution: z.string().optional(),
})

// GET - List user's dictionary words
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const words = await prisma.dictionary.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ words })
  } catch (error: any) {
    console.error("Dictionary GET error:", error)
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === 'P1001' || prismaError.code === 'P1000') {
        console.error("Database connection error:", prismaError.message)
        return NextResponse.json(
          { error: "Database connection failed. Please try again later." },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Add new dictionary word
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = dictionarySchema.parse(body)

    // Check if word already exists for this user
    const existing = await prisma.dictionary.findUnique({
      where: {
        userId_word: {
          userId: session.user.id,
          word: validatedData.word,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Word already exists in dictionary" },
        { status: 400 }
      )
    }

    const dictionaryEntry = await prisma.dictionary.create({
      data: {
        word: validatedData.word,
        substitution: validatedData.substitution,
        userId: session.user.id,
      },
    })

    return NextResponse.json(
      { word: dictionaryEntry },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Dictionary POST error:", error)
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: "Word already exists in dictionary" },
          { status: 400 }
        )
      }
      if (prismaError.code === 'P1001' || prismaError.code === 'P1000') {
        console.error("Database connection error:", prismaError.message)
        return NextResponse.json(
          { error: "Database connection failed. Please try again later." },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update dictionary word
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Dictionary entry ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.dictionary.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Dictionary entry not found" },
        { status: 404 }
      )
    }

    const validatedData = dictionarySchema.partial().parse(updateData)

    const updated = await prisma.dictionary.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json({ word: updated })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Dictionary PUT error:", error)
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: "Dictionary entry not found" },
          { status: 404 }
        )
      }
      if (prismaError.code === 'P1001' || prismaError.code === 'P1000') {
        console.error("Database connection error:", prismaError.message)
        return NextResponse.json(
          { error: "Database connection failed. Please try again later." },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Remove dictionary word
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Dictionary entry ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.dictionary.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Dictionary entry not found" },
        { status: 404 }
      )
    }

    await prisma.dictionary.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Dictionary DELETE error:", error)
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: "Dictionary entry not found" },
          { status: 404 }
        )
      }
      if (prismaError.code === 'P1001' || prismaError.code === 'P1000') {
        console.error("Database connection error:", prismaError.message)
        return NextResponse.json(
          { error: "Database connection failed. Please try again later." },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

