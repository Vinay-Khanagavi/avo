"use client"

import { LandingHero, FeatureHighlights } from "./landing-hero"
import { MouseTracker } from "./mouse-tracker"
import { GrainOverlay } from "./grain-overlay"

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient Background - Pastel colors from Unicorn Studio */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#FFE5D9] via-[#FFD4B3] via-[#E6E6FA] to-[#B0C4DE] dark:from-[#2a1f2e] dark:via-[#1a1a2e] dark:to-[#16213e]" />
      
      {/* Mouse Tracker Circle */}
      <MouseTracker />
      
      {/* Grain Overlay */}
      <GrainOverlay />
      
      {/* Content */}
      <div className="relative z-20">
        <LandingHero />
        <FeatureHighlights />
        
        {/* Footer CTA */}
        <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-medium mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of users transforming their voice into text.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="inline-flex items-center justify-center h-10 px-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create Account
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center h-10 px-8 rounded-md border bg-background hover:bg-accent transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

