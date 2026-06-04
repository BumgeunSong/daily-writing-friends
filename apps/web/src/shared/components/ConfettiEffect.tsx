import { useEffect } from "react"

export function ConfettiEffect() {
    useEffect(() => {
      if (typeof window === "undefined") return

      let cancelled = false
      let timer: ReturnType<typeof setTimeout> | null = null

      import("canvas-confetti").then((confettiModule) => {
        if (cancelled) return
        const confetti = confettiModule.default

        timer = setTimeout(() => {
          if (cancelled) return
          confetti({
            particleCount: 15,
            angle: 60,
            spread: 40,
            origin: { x: 0.2, y: 0.5 },
            gravity: 1.2,
            scalar: 0.7,
            colors: ["#FFD700", "#FFC0CB", "#87CEFA"],
            disableForReducedMotion: true,
          })

          confetti({
            particleCount: 15,
            angle: 120,
            spread: 40,
            origin: { x: 0.8, y: 0.5 },
            gravity: 1.2,
            scalar: 0.7,
            colors: ["#FFD700", "#FFC0CB", "#87CEFA"],
            disableForReducedMotion: true,
          })
        }, 300)
      })

      return () => {
        cancelled = true
        if (timer) clearTimeout(timer)
      }
    }, [])

    return null
  }