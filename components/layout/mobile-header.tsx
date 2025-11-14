"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function MobileHeader() {
  const { openMobile, setOpenMobile, isMobile } = useSidebar()

  // Only show on mobile devices
  if (!isMobile) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between md:hidden">
      {/* Logo */}
      <Link href="/dictation" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black dark:bg-white transition-colors">
          <div className="w-4 h-4 rounded-sm bg-white dark:bg-black transition-colors"></div>
        </div>
        <span className="text-xl font-semibold font-sans">AVO</span>
      </Link>

      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpenMobile(!openMobile)}
        className="h-9 w-9"
        aria-label={openMobile ? "Close menu" : "Open menu"}
      >
        {openMobile ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>
    </header>
  )
}