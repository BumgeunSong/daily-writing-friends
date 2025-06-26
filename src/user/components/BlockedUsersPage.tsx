import type React from "react"
import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { toast } from "sonner"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/ui/avatar"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import { ArrowLeft, UserX, Search, X } from "lucide-react"
import { useAuth } from '@/shared/hooks/useAuth'
import { blockUser, unblockUser, getBlockedUsers, fetchUser } from '@/user/api/user'
import useUserSearch from '@/user/hooks/useUserSearch'

// 검색 서제스트 드롭다운만 별도 컴포넌트로 분리 (Suspense 지원)
function SuggestionsDropdown({
  searchQuery,
  blockedUsers,
  currentUser,
  handleBlock,
  selectedSuggestionIndex,
  setSelectedSuggestionIndex,
  loading,
  suggestionsRef,
}: {
  searchQuery: string
  blockedUsers: any[]
  currentUser: any
  handleBlock: (user: any) => void
  selectedSuggestionIndex: number
  setSelectedSuggestionIndex: (idx: number) => void
  loading: boolean
  suggestionsRef: React.RefObject<HTMLDivElement>
}) {
  const { data: searchResult } = useUserSearch(searchQuery, currentUser?.boardPermissions)
  const suggestions = useMemo(() => {
    if (!searchResult || !searchQuery.trim()) return []
    const blockedUids = new Set(blockedUsers.map((user) => user.uid))
    const currentUserUid = currentUser?.uid
    const arr = Array.isArray(searchResult) ? searchResult : [searchResult]
    return arr
      .filter(
        (user) =>
          user &&
          user.uid !== currentUserUid &&
          !blockedUids.has(user.uid)
      )
      .slice(0, 5)
  }, [searchResult, searchQuery, blockedUsers, currentUser])

  if (suggestions.length > 0) {
    return (
      <div
        ref={suggestionsRef}
        className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
      >
        {suggestions.map((user, index) => (
          <button
            key={user.uid}
            className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors ${
              index === selectedSuggestionIndex ? "bg-muted" : ""
            }`}
            onClick={() => handleBlock(user)}
            disabled={loading}
            onMouseEnter={() => setSelectedSuggestionIndex(index)}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.profilePhotoURL || "/placeholder.svg"} />
              <AvatarFallback>{user.nickname?.[0] || ''}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{user.nickname}</div>
              <div className="text-sm text-muted-foreground truncate">{user.email}</div>
            </div>
          </button>
        ))}
      </div>
    )
  }
  if (searchQuery.trim() && suggestions.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 p-4 text-center text-muted-foreground">
        검색 결과가 없습니다
      </div>
    )
  }
  return null
}

export default function BlockedUsersPage() {
  const { currentUser } = useAuth()
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [confirmUnblockUid, setConfirmUnblockUid] = useState<string | null>(null)
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // 차단 목록 불러오기
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const blockedUids = await getBlockedUsers(currentUser.uid);
      if (!blockedUids || blockedUids.length === 0) {
        setBlockedUsers([]);
        return;
      }
      // 차단 유저 정보 fetch
      const users = await Promise.all(
        blockedUids.map(uid => fetchUser(uid))
      );
      setBlockedUsers(users.filter(Boolean));
    })();
  }, [currentUser]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSuggestions(value.trim().length > 0)
    setSelectedSuggestionIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Suspense 내부에서만 suggestions 사용
    if (!showSuggestions) return
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => prev + 1)
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        // Suspense 내부에서 suggestionsRef.current로 처리
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        suggestionsRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Block user
  const handleBlock = async (user: any) => {
    if (!currentUser) return;
    if (blockedUsers.length >= 10) {
      setShowLimitDialog(true)
      return
    }
    setLoading(true)
    try {
      await blockUser(currentUser.uid, user.uid)
      setBlockedUsers((prev) => [...prev, user])
      setSearchQuery("")
      setShowSuggestions(false)
      toast.success(`${user.nickname}님을 비공개 사용자로 설정했습니다.`, {position: 'bottom-center'})
    } catch (error) {
      toast.error("비공개 사용자 설정 중 오류가 발생했습니다.", {position: 'bottom-center'})
    }
    setLoading(false)
  }

  // Unblock user
  const handleUnblock = async (uid: string) => {
    if (!currentUser) return;
    setLoading(true)
    try {
      await unblockUser(currentUser.uid, uid)
      const user = blockedUsers.find((u) => u.uid === uid)
      setBlockedUsers((prev) => prev.filter((u) => u.uid !== uid))
      setConfirmUnblockUid(null)
      toast.success(`${user?.nickname}님의 비공개 설정을 해제했습니다.`, {position: 'bottom-center'})
    } catch (error) {
      toast.error("비공개 설정 해제 중 오류가 발생했습니다.", {position: 'bottom-center'})
    }
    setLoading(false)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Header */}
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">비공개 사용자 관리</h1>
            <p className="text-sm text-muted-foreground mt-1">비공개 사용자에게는 내 콘텐츠가 보이지 않습니다</p>
          </div>
        </header>

        {/* Search Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">사용자 검색</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="닉네임 또는 이메일로 검색"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                  className="pl-10 pr-10"
                  disabled={loading || blockedUsers.length >= 10}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Suspense로 검색 결과만 감싸기 */}
              {showSuggestions && searchQuery.trim() && (
                <Suspense fallback={
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 p-4 text-center text-muted-foreground">
                    검색 중...
                  </div>
                }>
                  <SuggestionsDropdown
                    searchQuery={searchQuery}
                    blockedUsers={blockedUsers}
                    currentUser={currentUser}
                    handleBlock={handleBlock}
                    selectedSuggestionIndex={selectedSuggestionIndex}
                    setSelectedSuggestionIndex={setSelectedSuggestionIndex}
                    loading={loading}
                    suggestionsRef={suggestionsRef}
                  />
                </Suspense>
              )}
            </div>

            {blockedUsers.length >= 10 && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                💡 비공개 사용자는 최대 10명까지 설정할 수 있습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blocked Users List */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">비공개 사용자 목록</CardTitle>
              <span className="text-sm text-muted-foreground">{blockedUsers.length}/10</span>
            </div>
          </CardHeader>
          <CardContent>
            {blockedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>비공개 사용자가 없습니다</p>
                <p className="text-sm mt-1">위에서 사용자를 검색하여 추가해보세요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map((user, index) => (
                  <div key={user.uid}>
                    <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={user.profilePhotoURL || "/placeholder.svg"} />
                        <AvatarFallback>{user.nickname[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.nickname}</div>
                        <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                      </div>
                      <AlertDialog open={confirmUnblockUid === user.uid}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmUnblockUid(user.uid)}
                            disabled={loading}
                          >
                            해제
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{user.nickname}님의 비공개 설정을 해제하시겠습니까?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setConfirmUnblockUid(null)}>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleUnblock(user.uid)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              해제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {index < blockedUsers.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Limit Dialog */}
        <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>비공개 사용자 한도 초과</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="py-4">
              <p>비공개 사용자는 최대 10명까지만 설정할 수 있습니다.</p>
              <p className="text-sm text-muted-foreground mt-2">
                새로운 사용자를 추가하려면 기존 사용자의 설정을 먼저 해제해주세요.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowLimitDialog(false)}>확인</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
