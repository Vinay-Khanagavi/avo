"use client"

import { useState, useEffect, useRef } from "react"
import { gsap } from "gsap"
import { Button } from "@/components/ui/button"
import { MicrophoneButton } from "@/components/dictation/microphone-button"
import Link from "next/link"
import { Mic, Check } from "lucide-react"

type TabType = "prompt" | "message" | "list" | "email"

interface TabContent {
  heading: string
  description: string
  content: string | React.ReactNode
  isEmail?: boolean
}

interface MainSectionProps {
  transcript?: string
  setTranscript?: (text: string) => void
  isRecording?: boolean
  isProcessing?: boolean
  onStart?: () => void
  onStop?: () => void
  onChunk?: (chunk: Blob) => void
}

const tabContents: Record<TabType, TabContent> = {
  prompt: {
    heading: "Try writing a detailed AI prompt.",
    description: "Flow makes it easy to give detailed prompts to ChatGPT, Cursor, or other AI tools.",
    content: "Plan a week-long itinerary for a trip to Italy that prioritizes historical sightseeing and local food tours. I prefer to see attractions in the mornings, take naps in the afternoons, and then have nice dinners solid by nightlife in the evenings.",
  },
  message: {
    heading: "Try messaging a friend.",
    description: "Flow makes texting your friends easy, and even edits filler words and corrections for you.",
    content: "Hey Richard, meet me at my apartment lobby at 6pm, actually no, 7pm.",
  },
  list: {
    heading: "Try making a grocery list.",
    description: "Watch as Flow formats lists for you in Notes or whatever note-taking tool you use.",
    content: (
      <>
        I want to grab three things at the grocery store:
        <br />
        <br />
        1. Milk for the cake
        <br />
        2. Eggs for breakfast
        <br />
        3. White bread
      </>
    ),
  },
  email: {
    heading: "Try drafting an email.",
    description: "Watch as Flow auto-formats emails for you in Gmail, Superhuman, Outlook.",
    isEmail: true,
    content: (
      <>
        Hi Nora,
        <br />
        <br />
        I&apos;m looking forward to working with you. Are you available to meet at 3pm on Friday?
        <br />
        <br />
        Best,
        <br />
        Jacob
      </>
    ),
  },
}

export function MainSection({
  transcript = "",
  setTranscript,
  isRecording = false,
  isProcessing = false,
  onStart,
  onStop,
  onChunk,
}: MainSectionProps) {
  // Handler for reset button
  const handleReset = () => {
    if (setTranscript) setTranscript("");
  };
  const [activeTab, setActiveTab] = useState<TabType>("prompt")
  const contentRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const gradientRef = useRef<HTMLDivElement>(null)
  const isInteractive = !!onStart && !!onStop && !!onChunk

  const tabs = [
    { id: "prompt" as TabType, label: "Write the perfect prompt" },
    { id: "message" as TabType, label: "Message a friend" },
    { id: "list" as TabType, label: "Write a list" },
    { id: "email" as TabType, label: "Draft an email" },
  ]

  const currentContent = tabContents[activeTab]

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      )
    }
  }, [activeTab])

  // Reset transcript when switching tabs in interactive mode
  useEffect(() => {
    if (isInteractive && setTranscript) {
      setTranscript("")
    }
  }, [activeTab, isInteractive, setTranscript])

  // Show/hide gradient background on recording state change (no movement animation)
  useEffect(() => {
    if (gradientRef.current) {
      if (isRecording) {
        gsap.to(gradientRef.current, { opacity: 1, duration: 0.3 })
      } else {
        gsap.to(gradientRef.current, { opacity: 0, duration: 0.3 })
      }
    }
  }, [isRecording])



  // Spacebar keyboard handler - use ref to persist across renders
  const isSpacebarPressedRef = useRef(false)

  useEffect(() => {
    if (!isInteractive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle spacebar if not typing in an input field
      const target = e.target as HTMLElement
      const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (e.code === "Space" && !isInputField && !isSpacebarPressedRef.current && !isRecording && !isProcessing) {
        e.preventDefault()
        isSpacebarPressedRef.current = true
        if (onStart) {
          onStart()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Only handle spacebar if not typing in an input field
      const target = e.target as HTMLElement
      const isInputField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (e.code === "Space" && !isInputField && isSpacebarPressedRef.current) {
        e.preventDefault()
        isSpacebarPressedRef.current = false
        if (isRecording && onStop) {
          onStop()
        }
      }
    }

    // Handle window blur to stop recording if spacebar is released outside window
    const handleBlur = () => {
      if (isSpacebarPressedRef.current && isRecording && onStop) {
        isSpacebarPressedRef.current = false
        onStop()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleBlur)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleBlur)
    }
  }, [isInteractive, isRecording, isProcessing, onStart, onStop])

  return (
    <section ref={sectionRef} className="w-full pt-4 md:pt-20 px-0 md:px-4 relative pb-10 overflow-hidden dictation-main-offset">
      {/* Static gradient background for recording */}
      {isRecording && (
        <div
          ref={gradientRef}
          className="pointer-events-none fixed inset-0 z-30"
          style={{
            background: "radial-gradient(ellipse 120% 80% at 60% 60%, #ffe5d9 0%, #ffd4b3 40%, #e6e6fa 70%, #b0c4de 100%)",
            opacity: 0
          }}
        />
      )}
      <div className="max-w-4xl mx-auto relative z-40">
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center mb-8 md:mb-12 px-4 md:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 md:px-6 py-2 md:py-3 rounded-lg font-sans font-semibold text-xs md:text-sm md:text-base
                transition-all duration-300 ease-out relative
                ${activeTab === tab.id
                  ? "bg-[#ffa946] text-black shadow-[3px_3px_2px_0px_rgba(0,0,0,0.4)] border-2 border-white"
                  : "bg-white text-black border-2 border-black hover:bg-gray-50"
                }
              `}
              style={{
                transform: activeTab === tab.id ? "rotate(-2deg)" : "rotate(0deg)",
              }}
            >
              <div>{tab.label}</div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div ref={contentRef} className="space-y-6 md:space-y-8 px-4 md:px-0">
          {/* Heading and Description */}
          <div className="text-center space-y-3 md:space-y-4">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium font-serif">
              {currentContent.heading}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground font-sans font-medium max-w-2xl mx-auto">
              {currentContent.description}
            </p>
          </div>

          {/* Input Area with Reset Button */}
          <div className="bg-white rounded-xl border border-gray-300 p-4 md:p-6 lg:p-8 shadow-sm relative overflow-visible">
            {/* Gradient is now behind the display, not inside */}
            {/* Reset button, only show if transcript and interactive */}
            {isInteractive && transcript && setTranscript && (
              <div className="absolute top-3 right-3 z-20">
                <div className="group relative z-50">
                  <button
                    onClick={handleReset}
                    className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full p-1 transition-colors shadow-sm focus:outline-none h-8 w-8 flex items-center justify-center"
                    aria-label="Clear the message."
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M19.418 15A7.978 7.978 0 0020 12c0-4.418-3.582-8-8-8a7.963 7.963 0 00-7.418 5M4.582 9A7.978 7.978 0 004 12c0 4.418 3.582 8 8 8a7.963 7.963 0 007.418-5" />
                    </svg>
                  </button>
                  <span
                    className="absolute -top-8 right-1/2 translate-x-1/2 whitespace-nowrap bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-9999"
                    style={{ zIndex: 9999 }}
                  >
                    Clear
                  </span>
                </div>
              </div>
            )}
            {currentContent.isEmail ? (
              <div className="space-y-6 relative z-10">
                {/* Email Header */}
                <div className="space-y-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-sans font-medium">To</span>
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-400 to-pink-400"></div>
                    <span className="font-sans font-medium">Nora Miller</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-sans font-medium">Subject</span>
                    <span className="font-sans font-semibold">My first Flow message</span>
                  </div>
                </div>
                {/* Email Body */}
                <div className="min-h-[200px] text-foreground font-sans font-medium leading-relaxed whitespace-pre-wrap">
                  {isInteractive && transcript ? (
                    transcript
                  ) : isInteractive && isRecording ? (
                    <span className="text-muted-foreground italic">Listening...</span>
                  ) : (
                    currentContent.content
                  )}
                </div>
              </div>
            ) : activeTab === "list" ? (
              <div className="space-y-4 relative z-10">
                <h3 className="text-xl font-semibold font-sans mb-4">Grocery List</h3>
                <div className="min-h-[150px] text-foreground font-sans font-medium leading-relaxed whitespace-pre-wrap">
                  {isInteractive && transcript ? (
                    transcript
                  ) : isInteractive && isRecording ? (
                    <span className="text-muted-foreground italic">Listening...</span>
                  ) : (
                    currentContent.content
                  )}
                </div>
              </div>
            ) : (
              <div className="min-h-[150px] text-foreground font-sans font-medium leading-relaxed whitespace-pre-wrap relative z-10">
                {isInteractive && transcript ? (
                  transcript
                ) : isInteractive && isRecording ? (
                  <span className="text-muted-foreground italic">Listening...</span>
                ) : (
                  currentContent.content
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isInteractive ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
              <MicrophoneButton
                onStart={onStart!}
                onStop={onStop!}
                onChunk={onChunk!}
                isRecording={isRecording}
                disabled={isProcessing}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
              <Button
                variant="glow"
                size="lg"
                className="text-base px-6 py-4 font-sans font-semibold"
                disabled
              >
                <Mic className="w-5 h-5 mr-2" />
                Start dictating
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-6 py-4 font-sans font-medium border-2 bg-white hover:bg-gray-50"
                disabled
              >
                <Check className="w-5 h-5 mr-2" />
                Stop dictating
              </Button>
              <Button
                asChild
                size="lg"
                className="text-base px-6 py-4 font-sans font-semibold bg-black text-white hover:bg-gray-800"
              >
                <Link href="/signup">Download for free</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

