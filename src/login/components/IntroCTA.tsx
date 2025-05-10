import { Button } from '@/shared/ui//button'

interface IntroCTAProps {
  cohort?: number
  onLogin: () => void
  isLoading?: boolean
}

export default function IntroCTA({ onLogin, cohort, isLoading = false }: IntroCTAProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t bg-background p-4">
      <div className="mx-auto max-w-3xl space-y-2 px-6 md:flex md:items-center md:justify-between md:space-x-4 md:space-y-0 lg:max-w-4xl">
        <p className="text-center text-sm text-muted-foreground md:shrink-0 md:text-left md:text-base">
          구글 로그인이 필요해요
        </p>
        <Button 
          onClick={onLogin} 
          className="w-full md:w-auto md:px-8" 
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? "처리 중..." : cohort ? `${cohort}기 신청하기` : "신청하기"}
        </Button>
      </div>
    </div>
  )
} 