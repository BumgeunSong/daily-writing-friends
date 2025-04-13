import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

interface JoinCompletePageProps {
  name: string
  cohort: number
}

export default function JoinCompletePage({ name, cohort }: JoinCompletePageProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl lg:text-3xl font-bold">
            {`${name}님, 신청이 완료되었습니다`}
          </h1>
          <p className="text-muted-foreground lg:text-lg">
            {`${cohort}기가 시작하기 하루 전 연락을 드려요.`}
            <br />
            {`조금만 기다려주세요!`}
          </p>
        </div>
      </main>

      <div className="p-6 border-t">
        <div className="max-w-3xl lg:max-w-4xl mx-auto">
          <Button
            onClick={() => navigate("/")}
            className="w-full lg:w-64 lg:mx-auto"
            size="lg"
          >
            홈으로
          </Button>
        </div>
      </div>
    </div>
  )
}
