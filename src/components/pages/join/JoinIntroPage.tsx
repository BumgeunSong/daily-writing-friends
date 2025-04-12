import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import CountdownSection from "./CountdownSection"
import CohortDetailsCard from "./CohortDetailsCard"
import NoticeSection from "./NoticeSection"
import GoalSection from "./GoalSection"

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

  const handleGoogleLogin = () => {
    navigate("/login")
  }

  return (
    <div className="flex justify-center min-h-screen bg-background">
      {/* Center container with max-width */}
      <div className="w-full max-w-3xl lg:max-w-4xl relative pb-24 flex flex-col">
        {/* Main content - scrollable */}
        <div className="flex-1 overflow-auto">
          {/* Header with Login Button */}
          <header className="p-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold md:text-3xl">매일 글쓰기 프렌즈</h1>
            <Button 
              onClick={handleGoogleLogin}
              className="bg-black text-white hover:bg-black/90"
            >
              로그인
            </Button>
          </header>

          {/* Hero Image */}
          <div className="w-full aspect-[16/10] relative bg-muted mx-auto mb-6 overflow-hidden">
            <img src="/writing_girl.png" alt="매일 글쓰기 프렌즈" className="w-full h-full object-cover" />
          </div>

          {/* Main content */}
          <div className="px-2 md:px-6 space-y-8">
            {/* Goal Section */}
            <div className="px-0 md:px-4">
              <GoalSection />
            </div>

            {/* Countdown Section */}
            <div className="px-0 md:px-4">
              <div className="bg-muted/10 p-6 rounded-lg">
                <CountdownSection daysRemaining={daysRemaining} />
              </div>
            </div>

            {/* Cohort Details and Notice Section */}
            <div className="px-4 md:px-4">
              <div className="md:grid md:grid-cols-2 md:gap-8 space-y-8 md:space-y-0">
                <CohortDetailsCard />
                <NoticeSection />
              </div>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-12" />

        {/* Sticky CTA at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="max-w-3xl lg:max-w-4xl mx-auto space-y-2 md:flex md:items-center md:justify-between md:space-y-0 md:space-x-4 px-6">
            <p className="text-center text-sm text-muted-foreground md:text-left md:text-base md:flex-shrink-0">
              구글 로그인이 필요해요
            </p>
            <Button onClick={handleGoogleLogin} className="w-full md:w-auto md:px-8" size="lg">
              N기 신청하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
