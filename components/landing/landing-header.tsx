"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function LandingHeader() {
  const [isVisible, setIsVisible] = useState(false)
  const [isArchitectureVisible, setIsArchitectureVisible] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    const architectureSection = document.getElementById("architecture")
    if (!architectureSection) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsArchitectureVisible(entry.isIntersecting)
      },
      { threshold: 0.3 }
    )

    observer.observe(architectureSection)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 20)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const highlightHeader = isArchitectureVisible || hasScrolled

  const scrollToArchitecture = () => {
    const architectureSection = document.getElementById("architecture")
    if (architectureSection) {
      architectureSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
      }`}
    >
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          highlightHeader
            ? "backdrop-blur-md bg-black/20 border-white/10 shadow-lg shadow-black/5"
            : "bg-transparent"
        }`}
      ></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
              highlightHeader ? "bg-white" : "bg-black"
            }`}>
              <div className={`w-4 h-4 rounded-sm transition-colors duration-300 ${
                highlightHeader ? "bg-black" : "bg-white"
              }`}></div>
            </div>
            <span className={`text-xl font-semibold font-sans transition-colors duration-300 ${
              highlightHeader ? "text-white" : "text-black"
            }`}>AVO</span>
          </Link>

          {/* Navigation - Architecture Button */}
          <div className="flex items-center gap-6">
            <Button
              onClick={scrollToArchitecture}
              className={`text-base font-medium rounded-full px-6 py-2 font-sans hover:scale-110 transition-all duration-300 ease-out ${
                highlightHeader
                  ? "text-white bg-white/20 hover:bg-white/30"
                  : "text-black bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Architecture
            </Button>

            {/* Sign In Link */}
            <Link
              href="/login"
              className={`text-base font-medium bg-transparent rounded-full px-6 py-2 transition-all duration-200 ease-out font-sans ${
                highlightHeader 
                  ? "text-white hover:bg-white/20" 
                  : "text-black hover:bg-gray-100"
              }`}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

