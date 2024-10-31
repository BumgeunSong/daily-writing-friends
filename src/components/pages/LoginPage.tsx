import React from 'react'
import { signInWithGoogle } from '../../firebase'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { loading } = useAuth()

  const handleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-muted-foreground">로그인 중...</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">매일 글쓰기 프렌즈</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <img src="/placeholder.svg?height=100&width=100" alt="Logo" className="w-24 h-24" />
          </div>
          <p className="text-center text-muted-foreground">구글 계정으로 로그인하여 시작하세요.</p>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleLogin}
            className="w-full"
          >
            구글로 로그인하기
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}