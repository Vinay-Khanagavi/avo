"use client"

import { useEffect, useRef } from "react"

export function GrainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
    }

    resize()
    window.addEventListener("resize", resize)

    // Create grain texture
    const imageData = ctx.createImageData(canvas.width / 2, canvas.height / 2)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255
      data[i] = value // R
      data[i + 1] = value // G
      data[i + 2] = value // B
      data[i + 3] = 8 // A - very subtle opacity
    }

    ctx.putImageData(imageData, 0, 0)

    return () => {
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10 opacity-30 mix-blend-soft-light"
      style={{ width: "100%", height: "100%" }}
    />
  )
}

