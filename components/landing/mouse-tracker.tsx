"use client"

import { useEffect, useState } from "react"

export function MouseTracker() {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 transition-all duration-300 ease-out"
      style={{
        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, oklch(0.9354 0.0456 94.8549 / 0.15), transparent 40%)`,
      }}
    />
  )
}

