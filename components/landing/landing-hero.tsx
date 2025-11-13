"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { gsap } from "gsap"
import { Button } from "@/components/ui/button"
import { AudioWaveform } from "./audio-waveform"
import { Mic, Zap, History, BookOpen } from "lucide-react"

function AnimatedHeadline({ words, className }: { words: string[]; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const charRefs = useRef<HTMLSpanElement[]>([])
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!containerRef.current || !isMounted) return

    // Collect all character spans (excluding space-only spans)
    const allSpans = containerRef.current.querySelectorAll("span")
    charRefs.current = Array.from(allSpans).filter(
      (span) => span.textContent && span.textContent.trim() !== ""
    )

    // Set initial position for all characters (below, hidden by overflow)
    charRefs.current.forEach((char) => {
      gsap.set(char, { y: "100%" })
    })

    // Animate characters with stagger
    const tl = gsap.timeline()
    tl.to(charRefs.current, {
      y: 0,
      duration: 0.6,
      ease: "back.out(1.2)",
      stagger: 0.03,
      delay: 0.2,
    })

    return () => {
      tl.kill()
    }
  }, [isMounted])

  return (
    <div ref={containerRef} className={className}>
      {words.map((word, wordIndex) => (
        <div
          key={wordIndex}
          className="inline-block overflow-hidden"
          style={{ display: "inline-block" }}
        >
          {word.split("").map((char, charIndex) => (
            <span
              key={`${wordIndex}-${charIndex}`}
              className="inline-block"
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
          {wordIndex < words.length - 1 && (
            <span className="inline-block" style={{ width: "0.25em" }}>
              {"\u00A0"}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function LandingHero() {
  const [isVisible, setIsVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div
      ref={heroRef}
      className={`min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-20 transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Main Heading - Using EB Garamond serif font */}
        <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-foreground font-serif">
          <AnimatedHeadline words={["Transform", "Your", "Voice"]} />
          <span className="text-primary italic">
            <AnimatedHeadline words={["Into", "Text"]} />
          </span>
        </h1>

        {/* Subheading - Using Figtree sans-serif font */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-sans font-medium">
          Speak naturally and watch your words become perfectly formatted text.
          Powered by AI for accuracy and speed.
        </p>

        {/* Audio Waveform Animation */}
        <div className="relative w-full max-w-3xl mx-auto h-32 md:h-40 my-12">
          <AudioWaveform className="w-full h-full" />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-[100]">
          <Button 
            asChild 
            size="lg" 
            className="text-base px-10 py-6 font-sans font-semibold bg-black text-white rounded-full hover:bg-black hover:scale-110 transition-all duration-300 ease-out relative z-[100]"
          >
            <Link href="/signup" className="relative z-[100]">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-10 py-6 font-sans font-medium rounded-full hover:bg-background hover:text-foreground relative z-[100]">
            <Link href="/login" className="relative z-[100]">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function FeatureHighlights() {
  const [isVisible, setIsVisible] = useState(false)
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (featuresRef.current) {
      observer.observe(featuresRef.current)
    }

    return () => {
      if (featuresRef.current) {
        observer.unobserve(featuresRef.current)
      }
    }
  }, [])

  const features = [
    {
      icon: Mic,
      title: "Real-time Transcription",
      description: "Speak and see your words appear instantly with high accuracy.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process audio in seconds with optimized AI-powered transcription.",
    },
    {
      icon: History,
      title: "Full History",
      description: "Access all your transcriptions with search and organization tools.",
    },
    {
      icon: BookOpen,
      title: "Custom Dictionary",
      description: "Add custom words and phrases for better recognition accuracy.",
    },
  ]

  return (
    <div
      ref={featuresRef}
      className="w-full max-w-6xl mx-auto px-4 py-20"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className={`p-6 rounded-lg border bg-card transition-all duration-700 ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold font-sans">{feature.title}</h3>
                <p className="text-sm text-muted-foreground font-sans font-medium">
                  {feature.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

