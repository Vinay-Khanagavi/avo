"use client"

import { Github } from "lucide-react"
import { LandingHero, FeatureHighlights } from "./landing-hero"
import { MouseTracker } from "./mouse-tracker"
import { GrainOverlay } from "./grain-overlay"
import { ArchitectureSection } from "./architecture-section"
import { LandingHeader } from "./landing-header"

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient Background - Pastel colors from Unicorn Studio */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(135deg,#FFE5D9_0%,#FFD4B3_35%,#E6E6FA_68%,#B0C4DE_100%)] dark:bg-[linear-gradient(135deg,#2a1f2e_0%,#1a1a2e_55%,#16213e_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[55vh] bg-linear-to-t from-[#d9d1ff]/90 via-[#eee9ff]/70 to-transparent blur-3xl dark:from-[#141731]/95 dark:via-[#1d2141]/75 dark:to-transparent" />
      
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-100">
            <a
              href="/signup"
              className="inline-flex items-center justify-center h-10 px-10 rounded-full bg-black text-white hover:bg-black hover:scale-110 transition-all duration-300 ease-out font-sans font-semibold relative z-100"
            >
              Create Account
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center h-10 px-10 rounded-full border border-gray-300 bg-white text-black hover:bg-white hover:scale-110 transition-all duration-300 ease-out font-sans font-medium relative z-100"
            >
              Sign In
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-8 text-center relative z-40">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <span className="text-sm font-sans">Built in 2025</span>
              <a
                href="https://github.com/Vinay-Khanagavi/avo"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="AVO GitHub repository"
                className="hover:text-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

