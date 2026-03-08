'use client'

import { useState } from 'react'
import { useAllFCMTokens } from '@/hooks/useAllFCMTokens'
import { FCMTokensTable } from '@/components/admin/FCMTokensTable'
import { SendFCMModal } from '@/components/admin/SendFCMModal'
import { sendFcmMessage } from '@/apis/sendFcm'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

// Firebase Messaging Admin Panel (UI 추후 구현)
// 이 파일은 관리자용 FCM 토큰/유저 정보 조회 및 테스트 메시지 전송 메인 페이지입니다.

export default function MessagingAdminPage() {
  const { data: tokens = [], isLoading, error, refetch } = useAllFCMTokens()
  const [selected, setSelected] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const pagedTokens = tokens
    .slice()
    .sort((a, b) => {
      const at = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp?.toDate?.()?.getTime?.() || 0;
      const bt = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp?.toDate?.()?.getTime?.() || 0;
      return bt - at;
    })
    .slice(0, page * PAGE_SIZE)

  // 개별 토큰 선택/해제
  const handleSelect = (tokenId: string) => {
    setSelected(prev =>
      prev.includes(tokenId) ? prev.filter(id => id !== tokenId) : [...prev, tokenId]
    )
  }
  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? tokens.map(t => t.id) : [])
  }

  // 메시지 전송 핸들러
  const handleSend = async ({ title, body }: { title: string; body: string }) => {
    setSending(true)
    setSendError(null)
    setSendSuccess(false)
    try {
      const res = await sendFcmMessage({
        tokens: tokens.filter(t => selected.includes(t.id)).map(t => t.token),
        notification: { title, body },
      })
      if (res.success) {
        setSendSuccess(true)
        toast.success(res.message)
        setSelected([])
        refetch()
      } else {
        setSendError(res.error || res.message)
      }
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Firebase Messaging 관리</h1>
        <p className="text-muted-foreground">디바이스 토큰과 유저 정보를 확인하고, 테스트 메시지를 전송할 수 있습니다.</p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <Button
          onClick={() => setModalOpen(true)}
          disabled={selected.length === 0 || sending}
          className="w-full sm:w-auto"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {selected.length > 0 ? `테스트 메시지 보내기 (${selected.length})` : '테스트 메시지 보내기'}
        </Button>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="w-full sm:w-auto">
          새로고침
        </Button>
      </div>
      <FCMTokensTable
        tokens={pagedTokens}
        selected={selected}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        loading={isLoading}
        error={error as Error}
      />
      {pagedTokens.length < tokens.length && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => setPage(p => p + 1)} variant="outline" className="w-full sm:w-auto">
            더 보기
          </Button>
        </div>
      )}
      <SendFCMModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selectedTokens={tokens.filter(t => selected.includes(t.id)).map(t => t.token)}
        onSend={handleSend}
        loading={sending}
        error={sendError}
        success={sendSuccess}
      />
    </main>
  )
} 