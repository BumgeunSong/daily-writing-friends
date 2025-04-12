import { Button } from "@/components/ui/button"

interface IntroHeaderProps {
  onLogin: () => void
}

export default function IntroHeader({ onLogin }: IntroHeaderProps) {
  return (
    <header className="p-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold md:text-3xl">매일 글쓰기 프렌즈</h1>
      <Button 
        onClick={onLogin}
        className="bg-black text-white hover:bg-black/90"
      >
        로그인
      </Button>
    </header>
  )
} 