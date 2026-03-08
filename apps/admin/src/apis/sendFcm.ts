export interface SendFcmPayload {
  tokens: string[]
  notification: {
    title: string
    body: string
  }
  data?: Record<string, string>
}

export interface SendFcmResponse {
  success: boolean
  message: string
  error?: string
}

/**
 * FCM 메시지 전송 API 호출 함수
 */
export async function sendFcmMessage(payload: SendFcmPayload): Promise<SendFcmResponse> {
  const res = await fetch('/api/send-fcm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    return {
      success: false,
      message: 'FCM 메시지 전송 실패',
      error: await res.text(),
    }
  }
  return res.json()
} 