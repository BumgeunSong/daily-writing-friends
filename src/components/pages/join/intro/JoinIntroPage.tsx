import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import IntroHeader from "./IntroHeader"
import IntroHero from "./IntroHero"
import IntroCTA from "./IntroCTA"
import GoalWrapper from "./GoalWrapper"
import CountdownWrapper from "./CountdownWrapper"
import CohortDetailsWrapper from "./CohortDetailsWrapper"
import { useUpcomingBoard } from "@/hooks/useUpcomingBoard"
import { useToast } from "@/hooks/use-toast"
import { signInWithGoogle } from "@/firebase"

export default function JoinIntroPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
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
      toast({
        title: "로그인 실패",
        description: "다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
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
