"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { Chip } from "@/components/ui/chip"

export function WaveformPill({ isSpeaking = false }: { isSpeaking?: boolean }) {
  const chipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chipRef.current) {
      // Set initial state
      gsap.set(chipRef.current, {
        opacity: 0,
        y: 30,
        scale: 0.85,
      })

      // Animate entrance with smooth bounce
      gsap.to(chipRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.4)",
      })
    }

    // Cleanup on unmount
    return () => {
      if (chipRef.current) {
        gsap.killTweensOf(chipRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed z-50 flex items-center justify-center pointer-events-none" style={{ bottom: '50px', left: '256px', right: 0 }}>
      <div ref={chipRef}>
        <Chip variant="flat" className="px-4 py-2 bg-black text-white mx-auto">
          <div className={`wd_pill flex items-center gap-2 ${isSpeaking ? "is-speaking" : ""}`}>
            <div className="wd_pill-bar-wrap flex items-end gap-1 h-6">
              <div className="wd_pill-bar w-0.5 bg-white rounded-full" style={{ height: "12px" }}></div>
              <div className="wd_pill-bar smaller w-0.5 bg-white rounded-full" style={{ height: "8px" }}></div>
              <div className="wd_pill-bar w-0.5 bg-white rounded-full" style={{ height: "14px" }}></div>
              <div className="wd_pill-bar smaller w-0.5 bg-white rounded-full" style={{ height: "9px" }}></div>
              <div className="wd_pill-bar w-0.5 bg-white rounded-full" style={{ height: "16px" }}></div>
              <div className="wd_pill-bar smaller w-0.5 bg-white rounded-full" style={{ height: "10px" }}></div>
              <div className="wd_pill-bar w-0.5 bg-white rounded-full" style={{ height: "13px" }}></div>
              <div className="wd_pill-bar smaller w-0.5 bg-white rounded-full" style={{ height: "8.5px" }}></div>
              <div className="wd_pill-bar w-0.5 bg-white rounded-full" style={{ height: "15px" }}></div>
              <div className="wd_pill-bar smaller w-0.5 bg-white rounded-full" style={{ height: "9.5px" }}></div>
            </div>
            <div className="wd_pill-lottie-wrap flex gap-1">
              <div className="wd_pill-dot w-1 h-1 bg-white rounded-full"></div>
              <div className="wd_pill-dot w-1 h-1 bg-white rounded-full"></div>
              <div className="wd_pill-dot w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>
        </Chip>
      </div>
    </div>
  )
}

