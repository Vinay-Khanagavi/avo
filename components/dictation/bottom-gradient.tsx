"use client"

export function BottomGradient() {
  return (
    <div className="fixed bottom-0 z-30 pointer-events-none" style={{ height: '192px', left: '256px', right: 0 }}>
      <div className="demo_bottom-gradient h-full w-full">
        <svg
          className="wave-svg w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
        >
          <path
            className="wave-path"
            d="M0,160 C120,100 240,220 480,160 C720,100 900,220 1080,160 C1260,100 1440,220 1440,160 L1440,320 L0,320 Z"
          />
        </svg>
      </div>
    </div>
  )
}

