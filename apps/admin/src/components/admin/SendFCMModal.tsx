import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTokens: string[]
  onSend: (payload: { title: string; body: string }) => Promise<void>
  loading?: boolean
  error?: string | null
  success?: boolean
}

export function SendFCMModal({ open, onOpenChange, selectedTokens, onSend, loading, error, success }: Props) {
  const [title, setTitle] = useState('테스트 메시지')
  const [body, setBody] = useState('이것은 관리자 테스트 메시지입니다.')
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    await onSend({ title, body })
    setSent(true)
  }

  // 모달 닫힐 때 입력값/상태 초기화
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTitle('테스트 메시지')
      setBody('이것은 관리자 테스트 메시지입니다.')
      setSent(false)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>테스트 FCM 메시지 전송</DialogTitle>
          <DialogDescription>
            {selectedTokens.length}개의 디바이스 토큰에 테스트 메시지를 전송합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="제목"
            maxLength={40}
            disabled={loading || sent}
            aria-label="메시지 제목"
          />
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="메시지 본문"
            rows={3}
            maxLength={200}
            disabled={loading || sent}
            aria-label="메시지 본문"
          />
        </div>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>전송 실패</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && sent && (
          <Alert variant="default" className="mt-2 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700">전송 성공</AlertTitle>
            <AlertDescription className="text-green-700">메시지가 성공적으로 전송되었습니다.</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button
            onClick={handleSend}
            disabled={loading || sent || !title.trim() || !body.trim()}
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            메시지 전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 