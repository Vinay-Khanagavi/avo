import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        name: validatedData.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    })

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    // Log detailed error for debugging
    console.error("Signup error:", error)
    
    // Check for PrismaClientInitializationError (database unreachable)
    if (error?.name === 'PrismaClientInitializationError' || error?.constructor?.name === 'PrismaClientInitializationError') {
      console.error("Database connection error - server unreachable:", error.message)
      return NextResponse.json(
        { 
          error: "Database service is unavailable. Please try again in a moment.",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }
    
    // Check for Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; message?: string; name?: string }
      
      // Duplicate entry error
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        )
      }
      
      // Connection errors
      if (prismaError.code === 'P1001' || prismaError.code === 'P1000' || prismaError.name === 'PrismaClientInitializationError') {
        console.error("Database connection error:", prismaError.message)
        return NextResponse.json(
          { 
            error: "Database service is unavailable. Please try again in a moment.",
            details: process.env.NODE_ENV === 'development' ? prismaError.message : undefined
          },
          { status: 503 }
        )
      }
    }
    
    // Check error message for connection-related keywords
    const errorMessage = error?.message || ''
    if (errorMessage.includes("Can't reach database server") || 
        errorMessage.includes("connect ECONNREFUSED") ||
        errorMessage.includes("Connection refused")) {
      console.error("Database connection refused:", errorMessage)
      return NextResponse.json(
        { 
          error: "Database service is unavailable. Please check that the database is running.",
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 503 }
      )
    }

    // Return more detailed error in development, generic in production
    const finalErrorMessage = process.env.NODE_ENV === 'production' 
      ? "Internal server error" 
      : error instanceof Error ? error.message : "Unknown error occurred"
    
    return NextResponse.json(
      { error: finalErrorMessage },
      { status: 500 }
    )
  }
}

