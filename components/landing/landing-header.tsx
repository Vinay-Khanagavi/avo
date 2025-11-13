"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function LandingHeader() {
  const scrollToArchitecture = () => {
    const architectureSection = document.getElementById("architecture")
    if (architectureSection) {
      architectureSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg shadow-black/5"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="text-xl font-semibold text-black font-sans">AVO</span>
          </Link>

          {/* Navigation - Architecture Button */}
          <div className="flex items-center gap-6">
            <Button
              onClick={scrollToArchitecture}
              className="text-base font-medium text-black bg-gray-100 hover:bg-gray-200 rounded-full px-6 py-2 font-sans hover:scale-110 transition-all duration-300 ease-out"
            >
              Architecture
            </Button>

            {/* Sign In Link */}
            <Link
              href="/login"
              className="text-base font-medium text-black bg-transparent hover:bg-gray-100 rounded-full px-6 py-2 transition-all duration-200 ease-out font-sans"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

