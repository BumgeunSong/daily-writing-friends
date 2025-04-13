import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import IntroHeader from "./IntroHeader"
import IntroHero from "./IntroHero"
import IntroCTA from "./IntroCTA"
import GoalWrapper from "./GoalWrapper"
import CountdownWrapper from "./CountdownWrapper"
import CohortDetailsWrapper from "./CohortDetailsWrapper"

export default function JoinIntroPage() {
  const navigate = useNavigate()
  const [daysRemaining, setDaysRemaining] = useState<number>(0)

  // Calculate days remaining until cohort starts
  useEffect(() => {
    // Set cohort start date (May 1, 2025)
    const cohortStartDate = new Date(2025, 4, 1) // Month is 0-indexed
    const today = new Date()
    const timeDiff = cohortStartDate.getTime() - today.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
    setDaysRemaining(daysDiff)
  }, [])

  const handleLogin = () => {
    navigate("/login")
  }

  return (
    <div className="flex justify-center min-h-screen bg-background">
      {/* Center container with max-width */}
      <div className="w-full max-w-3xl lg:max-w-4xl relative pb-24 flex flex-col">
        {/* Main content - scrollable */}
        <div className="flex-1 overflow-auto">
          <IntroHeader onLogin={handleLogin} />
          <IntroHero />
          <div className="px-2 md:px-6 space-y-8">
            <GoalWrapper />
            <CountdownWrapper daysRemaining={daysRemaining} />
            <CohortDetailsWrapper />
          </div>
        </div>

        {/* Spacer */}
        <div className="h-12" />

        {/* Sticky CTA at bottom */}
        <IntroCTA onLogin={handleLogin} />
      </div>
    </div>
  )
}
