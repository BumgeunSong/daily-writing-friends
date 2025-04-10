import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import CountdownSection from "./CountdownSection"
import CohortDetailsCard from "./CohortDetailsCard"
import NoticeSection from "./NoticeSection"

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
    <div className="flex flex-col min-h-screen bg-background relative pb-24">
      {/* Main content - scrollable */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="p-6">
          <h1 className="text-2xl font-bold">매글프 신청하기</h1>
        </header>

        {/* Hero Image */}
        <div className="w-full aspect-[16/9] relative bg-muted rounded-lg mx-auto my-4 overflow-hidden">
          <img
            src="https://placehold.co/800x400"
            alt="매일 글쓰기 프렌즈"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>

        {/* Main content */}
        <div className="px-6 space-y-6">
          <CountdownSection daysRemaining={daysRemaining} />
          <CohortDetailsCard />
          <NoticeSection />
        </div>
      </div>

      {/* add space of height 48px here */}
      <div className="h-12" />

      {/* Sticky CTA at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-md mx-auto space-y-2">
          <p className="text-center text-sm text-muted-foreground">구글 로그인이 필요해요</p>
          <Button onClick={handleGoogleLogin} className="w-full" size="lg">
            N기 신청하기
          </Button>
        </div>
      </div>
    </div>
  )
}
