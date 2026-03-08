import { useEffect } from "react"

export function ConfettiEffect() {
    useEffect(() => {
      // Trigger subtle confetti animation
      if (typeof window !== "undefined") {
        // Import confetti dynamically to avoid SSR issues
        import("canvas-confetti").then((confettiModule) => {
          const confetti = confettiModule.default
  
          // Fire just once from each side with fewer particles
          setTimeout(() => {
            confetti({
              particleCount: 15, // Fewer particles
              angle: 60,
              spread: 40, // Narrower spread
              origin: { x: 0.2, y: 0.5 }, // More centered
              gravity: 1.2, // Faster fall
              scalar: 0.7, // Smaller confetti pieces
              colors: ["#FFD700", "#FFC0CB", "#87CEFA"],
              disableForReducedMotion: true, // Accessibility
            })
  
            confetti({
              particleCount: 15, // Fewer particles
              angle: 120,
              spread: 40, // Narrower spread
              origin: { x: 0.8, y: 0.5 }, // More centered
              gravity: 1.2, // Faster fall
              scalar: 0.7, // Smaller confetti pieces
              colors: ["#FFD700", "#FFC0CB", "#87CEFA"],
              disableForReducedMotion: true, // Accessibility
            })
          }, 300) // Small delay for better timing with animations
        })
      }
    }, [])
  
    return null // This component doesn't render anything
  }