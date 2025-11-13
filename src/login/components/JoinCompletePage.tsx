import { useNavigate } from "react-router-dom"
import { Button } from "@/shared/ui/button"
import { useAuth } from "@/shared/hooks/useAuth"

interface JoinCompletePageProps {
  name: string
  cohort: number
}

export default function JoinCompletePage({ name, cohort }: JoinCompletePageProps) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const handleGoToBoards = () => {
    navigate("/boards")
  }

  const handleGoHome = () => {
    navigate("/")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-foreground lg:text-3xl">
            {`${name}님, 신청이 완료되었습니다`}
          </h1>
          <p className="leading-relaxed text-muted-foreground lg:text-lg">
            {`${cohort}기가 시작하기 하루 전 연락을 드려요.`}
            <br />
            {`조금만 기다려주세요!`}
          </p>
        </div>
      </main>

      <div className="border-t border-border p-6">
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          {currentUser ? (
            <Button
              variant="default"
              onClick={handleGoToBoards}
              className="w-full"
              size="lg"
            >
              게시판 보기
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleGoHome}
              className="w-full"
              size="lg"
            >
              홈으로
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
