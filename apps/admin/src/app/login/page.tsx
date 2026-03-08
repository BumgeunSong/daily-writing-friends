'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, LogIn } from "lucide-react"

export default function LoginPage() {
  const { user, login, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.push('/admin')
  }, [user, router])

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">관리자 로그인</CardTitle>
          <CardDescription className="text-center">
            계속하려면 Google 계정으로 로그인하세요
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Button 
              className="w-full" 
              size="lg" 
              onClick={login}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Google로 로그인
            </Button>
          )}
        </CardContent>
        
        <CardFooter className="text-xs text-center text-muted-foreground flex justify-center">
          관리자 전용 페이지입니다
        </CardFooter>
      </Card>
    </div>
  )
}