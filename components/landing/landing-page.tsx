"use client"

import { LandingHero, FeatureHighlights } from "./landing-hero"
import { MouseTracker } from "./mouse-tracker"
import { GrainOverlay } from "./grain-overlay"
import { ArchitectureSection } from "./architecture-section"
import { LandingHeader } from "./landing-header"

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient Background - Pastel colors from Unicorn Studio */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#FFE5D9] via-[#FFD4B3] via-[#E6E6FA] to-[#B0C4DE] dark:from-[#2a1f2e] dark:via-[#1a1a2e] dark:to-[#16213e]" />
      
      {/* Mouse Tracker Circle */}
      <MouseTracker />
      
      {/* Grain Overlay */}
      <GrainOverlay />
      
      {/* Header */}
      <LandingHeader />
      
      {/* Content */}
      <div className="relative z-40">
        <LandingHero />
        <div id="architecture">
          <ArchitectureSection />
        </div>
        <FeatureHighlights />
        
        {/* Footer CTA */}
        <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-medium mb-4 font-serif">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8 font-sans font-medium">
            Join thousands of users transforming their voice into text.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-[100]">
            <a
              href="/signup"
              className="inline-flex items-center justify-center h-10 px-10 rounded-full bg-[#F0D7FF] text-black hover:bg-[#F0D7FF] hover:scale-110 transition-all duration-300 ease-out font-sans font-semibold relative z-[100]"
            >
              Create Account
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center h-10 px-10 rounded-full border border-gray-300 bg-white text-black hover:bg-white hover:scale-110 transition-all duration-300 ease-out font-sans font-medium relative z-[100]"
            >
              Sign In
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-8 text-center relative z-40">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-sm text-muted-foreground font-sans">
              Built in 2025... Supported by{" "}
              <a
                href="https://blink.new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                blink.new
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

