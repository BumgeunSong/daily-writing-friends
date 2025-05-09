import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { signInWithGoogle } from "@/firebase"
import { useUpcomingBoard } from "@/hooks/useUpcomingBoard"
import CohortDetailsWrapper from "./CohortDetailsWrapper"
import CountdownWrapper from "./CountdownWrapper"
import GoalWrapper from "./GoalWrapper"
import IntroCTA from "./IntroCTA"
import IntroHeader from "./IntroHeader"
import IntroHero from "./IntroHero"

export default function JoinIntroPage() {
  const navigate = useNavigate()
  const [daysRemaining, setDaysRemaining] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { data: upcomingBoard } = useUpcomingBoard()
  
  // Calculate days remaining until cohort starts
  useEffect(() => {
    if (upcomingBoard && upcomingBoard.firstDay) {
      const cohortStartDate = upcomingBoard.firstDay.toDate()
      const today = new Date()
      const timeDiff = cohortStartDate.getTime() - today.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
      setDaysRemaining(daysDiff)
    }
  }, [upcomingBoard])

  const handleLogin = () => {
    navigate("/login")
  }

  const handleJoin = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle()
      navigate("/join/form")
    } catch (error) {
      console.error("Error during sign-in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-background">
      {/* Center container with max-width */}
      <div className="relative flex w-full max-w-3xl flex-col pb-24 lg:max-w-4xl">
        {/* Main content - scrollable */}
        <div className="flex-1 overflow-auto">
          <IntroHeader onLogin={handleLogin} />
          <IntroHero />
          <div className="space-y-8 px-2 md:px-6">
            <GoalWrapper />
            <CountdownWrapper daysRemaining={daysRemaining} />
            <CohortDetailsWrapper upcomingBoard={upcomingBoard} />
          </div>
        </div>

        {/* Spacer */}
        <div className="h-12" />

        {/* Sticky CTA at bottom */}
        <IntroCTA onLogin={handleJoin} cohort={upcomingBoard?.cohort} isLoading={isLoading} />
      </div>
    </div>
  )
}
