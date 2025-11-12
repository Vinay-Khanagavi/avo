"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"

interface AudioWaveformProps {
  className?: string
  barCount?: number
  color?: string
}

export function AudioWaveform({
  className = "",
  barCount = 50,
  color = "#212121", // Dark grey color (matches oklch(0.3485 0 0))
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barsRef = useRef<number[]>([])
  const barObjectsRef = useRef<Record<string, number>>({})
  const animationsRef = useRef<gsap.core.Tween[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize bars with random values
    barsRef.current = Array.from({ length: barCount }, () => Math.random() * 0.4 + 0.2)
    
    // Create object for GSAP to animate
    barObjectsRef.current = {}
    barsRef.current.forEach((value, index) => {
      barObjectsRef.current[`bar${index}`] = value
    })

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2 // For retina displays
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
    }

    resize()
    window.addEventListener("resize", resize)

    // Function to update target values smoothly
    const updateTargets = () => {
      barsRef.current.forEach((_, index) => {
        const newTarget = Math.random() * 0.65 + 0.2
        const barKey = `bar${index}`

        // Animate bar to new target using GSAP
        if (animationsRef.current[index]) {
          animationsRef.current[index].kill()
        }

        animationsRef.current[index] = gsap.to(barObjectsRef.current, {
          [barKey]: newTarget,
          duration: 2.5 + Math.random() * 1.5, // 2.5-4 seconds for smooth, slow animation
          ease: "power2.inOut", // Smooth easing
          onUpdate: () => {
            barsRef.current[index] = barObjectsRef.current[barKey]
          },
        })
      })
    }

    // Update targets periodically (slower updates)
    const targetInterval = setInterval(updateTargets, 3500) // Update every 3.5 seconds

    // Initial update with slight delay for staggered effect
    setTimeout(() => {
      updateTargets()
    }, 100)

    // Render loop
    let animationFrame: number
    const render = () => {
      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2)

      const totalWidth = canvas.width / 2
      const barWidth = totalWidth / barCount
      const gap = barWidth * 0.1
      const maxHeight = (canvas.height / 2) * 0.85
      const baselineY = canvas.height / 2 - 15

      barsRef.current.forEach((bar, index) => {
        const height = bar * maxHeight
        const x = index * (barWidth + gap) + barWidth / 2
        const barX = x - barWidth / 2
        const barY = baselineY - height
        const radius = Math.min(barWidth * 0.5, height * 0.4)

        // Draw shadow first (subtle)
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
        ctx.beginPath()
        ctx.moveTo(barX + 1, baselineY + 1)
        ctx.lineTo(barX + barWidth + 1, baselineY + 1)
        ctx.lineTo(barX + barWidth + 1, barY + radius + 1)
        ctx.arc(barX + barWidth / 2 + 1, barY + 1, radius, 0, Math.PI, true)
        ctx.closePath()
        ctx.fill()

        // Draw rounded rectangle bar (pill-like with rounded top, flat bottom)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(barX, baselineY)
        ctx.lineTo(barX + barWidth, baselineY)
        ctx.lineTo(barX + barWidth, barY + radius)
        ctx.arc(barX + barWidth / 2, barY, radius, 0, Math.PI, true)
        ctx.lineTo(barX, baselineY)
        ctx.closePath()
        ctx.fill()
      })

      animationFrame = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener("resize", resize)
      clearInterval(targetInterval)
      animationsRef.current.forEach((anim) => anim?.kill())
      cancelAnimationFrame(animationFrame)
    }
  }, [barCount, color])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  )
}

