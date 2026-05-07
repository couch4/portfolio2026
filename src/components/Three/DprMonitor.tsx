import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSceneStore } from '@/store/sceneStore'

// Lightweight adaptive DPR. Counts frames (one ref increment per frame — near
// zero cost) and evaluates average FPS every INTERVAL ms. Steps DPR ±STEP when
// FPS falls outside a dead-zone, then resets the counter so the next window
// measures a full interval of stable rendering at the new DPR.
const DPR_MIN = 0.5
const DPR_MAX_CAP = 2
const DPR_STEP = 0.1
const DPR_INTERVAL_MS = 1_000
const FPS_FLOOR = 40 // below this → step down
const FPS_CEIL = 55 // above this → step up

const DprMonitor = () => {
  const setDpr = useThree((s) => s.setDpr)
  const isSwiping = useSceneStore((s) => s.isSwiping)
  const dpr = useRef(Math.min(DPR_MAX_CAP, window.devicePixelRatio))
  const stableDpr = useRef(Math.min(DPR_MAX_CAP, window.devicePixelRatio))
  const wasSwiping = useRef(false)
  const frames = useRef(0)
  const lastCheck = useRef(performance.now())

  useFrame(() => {
    // Swipe just ended → snap immediately to last known stable DPR
    if (wasSwiping.current && !isSwiping) {
      wasSwiping.current = false
      dpr.current = stableDpr.current
      setDpr(stableDpr.current)
      // Reset FPS counters so adaptive loop restarts cleanly
      frames.current = 0
      lastCheck.current = performance.now()
      return
    }
    wasSwiping.current = isSwiping

    // During swipe: hold at min, skip FPS sampling
    if (isSwiping) {
      if (dpr.current !== DPR_MIN) {
        dpr.current = DPR_MIN
        setDpr(DPR_MIN)
      }
      return
    }

    frames.current++
    const now = performance.now()
    const elapsed = now - lastCheck.current
    if (elapsed < DPR_INTERVAL_MS) return

    const fps = (frames.current / elapsed) * 1000
    frames.current = 0
    lastCheck.current = now

    const maxDpr = Math.min(DPR_MAX_CAP, window.devicePixelRatio)
    let next = dpr.current

    if (fps < FPS_FLOOR && dpr.current > DPR_MIN) {
      next = Math.max(DPR_MIN, +(dpr.current - DPR_STEP).toFixed(2))
    } else if (fps > FPS_CEIL && dpr.current < maxDpr) {
      next = Math.min(maxDpr, +(dpr.current + DPR_STEP).toFixed(2))
    }

    if (next !== dpr.current) {
      dpr.current = next
      stableDpr.current = next // keep stable DPR up to date

      console.log(next)
      setDpr(next)
    }
  })

  return null
}

export default DprMonitor
