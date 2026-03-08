import "server-only";
import { NextRequest, NextResponse } from 'next/server'
import { initAdmin } from '@/app/api/firebaseAdmin'
import * as admin from 'firebase-admin'

export async function POST(req: NextRequest) {
  try {
    await initAdmin()
    const { tokens, notification, data } = await req.json()
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ success: false, message: '토큰이 필요합니다.' }, { status: 400 })
    }
    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json({ success: false, message: '알림 제목/내용이 필요합니다.' }, { status: 400 })
    }

    // sendMulticast 타입 에러 우회: 개별 send() 호출
    const results = await Promise.all(
      tokens.map(token =>
        admin.messaging().send({
          token,
          notification,
          data,
        }).then(
          () => ({ success: true, token }),
          (error) => ({ success: false, token, error: error.message })
        )
      )
    )
    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: true,
      message: `${successCount}개 메시지 전송 성공, ${failureCount}개 실패`,
      results,
    })
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
} 