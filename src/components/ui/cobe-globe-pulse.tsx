import { useEffect, useRef, useCallback } from "react"
import createGlobe from "cobe"

export interface RegionMarker {
  id: string
  location: [number, number]
  delay: number
  label: string
  region: string
}

interface GlobePulseProps {
  markers?: RegionMarker[]
  className?: string
  speed?: number
}

// Default: real AWS region coordinates
export const AWS_REGION_MARKERS: RegionMarker[] = [
  { id: "use1",  location: [38.90, -77.03],  delay: 0,    label: "N. Virginia",  region: "us-east-1" },
  { id: "usw2",  location: [45.52, -122.68], delay: 0.4,  label: "Oregon",       region: "us-west-2" },
  { id: "euw1",  location: [53.33, -6.25],   delay: 0.8,  label: "Ireland",      region: "eu-west-1" },
  { id: "euc1",  location: [50.11, 8.68],    delay: 1.2,  label: "Frankfurt",    region: "eu-central-1" },
  { id: "apse1", location: [1.35,  103.82],  delay: 1.6,  label: "Singapore",    region: "ap-southeast-1" },
  { id: "apne1", location: [35.68, 139.69],  delay: 2.0,  label: "Tokyo",        region: "ap-northeast-1" },
  { id: "aps1",  location: [19.07, 72.88],   delay: 2.4,  label: "Mumbai",       region: "ap-south-1" },
]

export function GlobePulse({
  markers = AWS_REGION_MARKERS,
  className = "",
  speed = 0.003,
}: GlobePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
    isPausedRef.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        }
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId: number
    let phi = 0

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.25,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        // Slate base — matches card surface #0f172a
        baseColor: [0.06, 0.09, 0.16],
        // Electric green markers — #00ff88
        markerColor: [0.0, 1.0, 0.53],
        // Near-black glow — #000814
        glowColor: [0.0, 0.02, 0.05],
        markerElevation: 0,
        markers: markers.map((m) => ({ location: m.location, size: 0.04, id: m.id })),
        arcs: [],
        arcColor: [0.0, 1.0, 0.53],
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.85,
      })

      function animate() {
        if (!isPausedRef.current) phi += speed
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.25 + thetaOffsetRef.current + dragOffset.current.theta,
        })
        animationId = requestAnimationFrame(animate)
      }
      animate()
      setTimeout(() => canvas && (canvas.style.opacity = "1"))
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
    }
  }, [markers, speed])

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <style>{`
        @keyframes globe-pulse-expand {
          0%   { transform: scaleX(0.3) scaleY(0.3); opacity: 0.9; }
          100% { transform: scaleX(1.6) scaleY(1.6); opacity: 0; }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          height: "100%",
          cursor: "grab",
          opacity: 0,
          transition: "opacity 1.2s ease",
          borderRadius: "50%",
          touchAction: "none",
        }}
      />
      {markers.map((m) => (
        <div
          key={m.id}
          style={{
            position: "absolute",
            // @ts-expect-error CSS Anchor Positioning API
            positionAnchor: `--cobe-${m.id}`,
            bottom: "anchor(center)",
            left: "anchor(center)",
            translate: "-50% 50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none" as const,
            opacity: `var(--cobe-visible-${m.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 6px))`,
            transition: "opacity 0.4s, filter 0.4s",
          }}
        >
          <span style={{
            position: "absolute",
            inset: 0,
            border: "1.5px solid #00ff88",
            borderRadius: "50%",
            opacity: 0,
            animation: `globe-pulse-expand 2.4s ease-out infinite ${m.delay}s`,
          }} />
          <span style={{
            position: "absolute",
            inset: 0,
            border: "1.5px solid #00ff88",
            borderRadius: "50%",
            opacity: 0,
            animation: `globe-pulse-expand 2.4s ease-out infinite ${m.delay + 0.6}s`,
          }} />
          <span style={{
            width: 8,
            height: 8,
            background: "#00ff88",
            borderRadius: "50%",
            boxShadow: "0 0 0 2px #000814, 0 0 0 4px #00ff88, 0 0 12px rgba(0,255,136,0.5)",
          }} />
        </div>
      ))}
    </div>
  )
}
