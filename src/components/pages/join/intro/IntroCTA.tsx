import { Button } from "@/components/ui/button"

interface IntroCTAProps {
  cohort?: number
  onLogin: () => void
}

export default function IntroCTA({ onLogin, cohort }: IntroCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
      <div className="max-w-3xl lg:max-w-4xl mx-auto space-y-2 md:flex md:items-center md:justify-between md:space-y-0 md:space-x-4 px-6">
        <p className="text-center text-sm text-muted-foreground md:text-left md:text-base md:flex-shrink-0">
          구글 로그인이 필요해요
        </p>
        <Button onClick={onLogin} className="w-full md:w-auto md:px-8" size="lg">
          {cohort ? `${cohort}기 신청하기` : "신청하기"}
        </Button>
      </div>
    </div>
  )
} 