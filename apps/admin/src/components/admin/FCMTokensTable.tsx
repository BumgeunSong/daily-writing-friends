import { FirebaseMessagingTokenWithUser } from '@/types/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Smartphone, User2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseUserAgent } from '@/types/userAgent'

interface Props {
  tokens: FirebaseMessagingTokenWithUser[]
  selected: string[]
  onSelect: (tokenId: string) => void
  onSelectAll: (checked: boolean) => void
  loading?: boolean
  error?: Error | null
}

export function FCMTokensTable({ tokens, selected, onSelect, onSelectAll, loading, error }: Props) {
  // 모바일: 카드형, 데스크탑: Table
  // 토큰 복사 기능, 등록일시, userAgent, 유저 정보 등 표시

  if (loading) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>디바이스 토큰 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>토큰 정보를 불러올 수 없습니다</AlertTitle>
        <AlertDescription>
          {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  if (!tokens || tokens.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>디바이스 토큰 목록</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <Smartphone className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
          <div>등록된 디바이스 토큰이 없습니다.</div>
        </CardContent>
      </Card>
    )
  }

  // 정렬: 최신순
  const sortedTokens = [...tokens].sort((a, b) => {
    const at = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp?.toDate?.()?.getTime?.() || 0;
    const bt = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp?.toDate?.()?.getTime?.() || 0;
    return bt - at;
  });

  // 반응형: sm 이하에서는 카드, sm 이상에서는 테이블
  return (
    <div className="mt-4">
      <div className="hidden sm:block">
        <Card>
          <CardHeader>
            <CardTitle>디바이스 토큰 목록</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={selected.length === tokens.length}
                      onCheckedChange={checked => onSelectAll(!!checked)}
                      aria-label="전체 선택"
                    />
                  </TableHead>
                  <TableHead>실명</TableHead>
                  <TableHead>닉네임</TableHead>
                  <TableHead>토큰</TableHead>
                  <TableHead>userAgent</TableHead>
                  <TableHead>등록일시</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTokens.map(token => (
                  <TableRow key={token.id} className={selected.includes(token.id) ? 'bg-muted' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(token.id)}
                        onCheckedChange={() => onSelect(token.id)}
                        aria-label="토큰 선택"
                      />
                    </TableCell>
                    <TableCell>{token.user.realName || <span className="text-gray-400">-</span>}</TableCell>
                    <TableCell>{token.user.nickname || <span className="text-gray-400">-</span>}</TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      <span className="font-mono text-xs select-all">{token.token.slice(0, 10)}... </span>
                      <Button size="icon" variant="ghost" className="ml-1" onClick={() => navigator.clipboard.writeText(token.token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">{parseUserAgent(token.userAgent)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {typeof token.timestamp === 'string'
                        ? new Date(token.timestamp).toLocaleString('ko-KR')
                        : token.timestamp?.toDate?.()?.toLocaleString('ko-KR') || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {/* 모바일 카드형 */}
      <div className="sm:hidden space-y-3">
        {sortedTokens.map(token => (
          <Card key={token.id} className={selected.includes(token.id) ? 'border-primary' : ''}>
            <CardContent className="flex flex-col gap-2 py-3 px-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.includes(token.id)}
                  onCheckedChange={() => onSelect(token.id)}
                  aria-label="토큰 선택"
                />
                <User2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{token.user.realName || '-'}</span>
                <span className="text-xs text-muted-foreground ml-2">{token.user.nickname || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono select-all truncate max-w-[100px]">{token.token.slice(0, 10)}... </span>
                <Button size="icon" variant="ghost" className="ml-1" onClick={() => navigator.clipboard.writeText(token.token)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">userAgent:</span>
                <span className="truncate max-w-[120px]">{parseUserAgent(token.userAgent)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">등록일시:</span>
                <span>{typeof token.timestamp === 'string'
                  ? new Date(token.timestamp).toLocaleString('ko-KR')
                  : token.timestamp?.toDate?.()?.toLocaleString('ko-KR') || '-'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 