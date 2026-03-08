'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UsersPage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>사용자 관리</CardTitle>
          <CardDescription>
            시스템의 모든 사용자를 관리하고 권한을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>사용자 관리 기능이 여기에 구현될 예정입니다.</p>
        </CardContent>
      </Card>
    </div>
  )
} 