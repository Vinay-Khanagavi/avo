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
      <div className="fixed inset-0 bg-gradient-to-br from-[#FFE5D9] via-[#FFD4B3] via-[#E6E6FA] to-[#B0C4DE] dark:from-[#2a1f2e] dark:via-[#1a1a2e] dark:to-[#16213e]" />
      
      {/* Header */}
      <LandingHeader />
      
      {/* Mouse Tracker Circle */}
      <MouseTracker />
      
      {/* Grain Overlay */}
      <GrainOverlay />
      
      {/* Content */}
      <div className="relative z-20">
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="inline-flex items-center justify-center h-10 px-8 rounded-md bg-[#F0D7FF] text-foreground hover:bg-[#DFAAFF] transition-colors font-sans font-semibold animate-[purple-glow_2s_ease-in-out_infinite]"
            >
              Create Account
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center h-10 px-8 rounded-md border bg-background hover:bg-accent transition-colors font-sans font-medium"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

