"use client"

import { useEffect, useRef, useState } from "react"
import { ArchitectureDiagram } from "./architecture-diagram"
import { Zap, Server, Database, Shield } from "lucide-react"

export function ArchitectureSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  const features = [
    {
      icon: Zap,
      title: "Always-On Performance",
      description: "Whisper model pre-loaded in memory for instant transcription",
    },
    {
      icon: Server,
      title: "Scalable Infrastructure",
      description: "AWS EC2 with dedicated resources, no cold starts",
    },
    {
      icon: Database,
      title: "Reliable Storage",
      description: "PostgreSQL on Railway for persistent data management",
    },
    {
      icon: Shield,
      title: "Secure Architecture",
      description: "AWS Security Groups protecting all endpoints",
    },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-24 overflow-hidden"
      style={{
        background: "linear-gradient(to bottom, #000000 0%, #0a0a0a 50%, #000000 100%)",
      }}
    >
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-medium mb-4 bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent">
            Scalable Architecture
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Built for performance and reliability using AWS EC2, Railway, and modern cloud infrastructure
          </p>
        </div>

        {/* Architecture Diagram */}
        <div
          className={`mb-16 transition-all duration-1000 ease-out delay-300 ${
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-4 md:p-8 shadow-2xl overflow-hidden">
            <ArchitectureDiagram />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={`p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-lg transition-all duration-700 ease-out hover:border-white/40 hover:from-white/15 hover:to-white/10 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{
                  transitionDelay: `${600 + index * 100}ms`,
                }}
              >
                <div className="flex flex-col space-y-4">
                  <div className="p-3 bg-white/10 rounded-lg w-fit">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Architecture Details */}
        <div
          className={`mt-16 p-8 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-xl transition-all duration-1000 ease-out delay-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h3 className="text-2xl font-semibold text-white mb-6">
            Architecture Highlights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">AWS EC2 Deployment</h4>
                <p className="text-white/70 text-sm">
                  Whisper service runs on dedicated EC2 instances with Docker containers. 
                  Models are pre-loaded in memory, eliminating cold starts and ensuring 
                  sub-10 second transcription times.
                </p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Railway Hosting</h4>
                <p className="text-white/70 text-sm">
                  Next.js application and PostgreSQL database are hosted on Railway, 
                  providing seamless deployment, automatic SSL, and integrated database management.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">Real-time Streaming</h4>
                <p className="text-white/70 text-sm">
                  WebSocket connections enable real-time audio streaming from the browser 
                  to the Whisper service, with chunked processing for low-latency transcription.
                </p>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Security & Scalability</h4>
                <p className="text-white/70 text-sm">
                  AWS Security Groups control access, while the architecture supports 
                  horizontal scaling. EC2 instances can be upgraded or replicated 
                  based on demand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

