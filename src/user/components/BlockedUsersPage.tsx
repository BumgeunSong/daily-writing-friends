import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUser, addBlockedUser, removeBlockedUser, fetchUsersWithBoardPermission } from '@/user/api/user';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/shared/ui/alert-dialog';
import { Loader2, UserX, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useUserSearch from '@/user/hooks/useUserSearch';

function SearchResultWithSuspense({
  search,
  boardPermissions,
  onBlock,
  loading,
}: {
  search: string;
  boardPermissions: Record<string, string> | undefined;
  onBlock: (uid: string, user: any) => void;
  loading: boolean;
}) {
  const { data: searchResult } = useUserSearch(search, boardPermissions);
  if (!searchResult) {
    return <div className="text-muted-foreground text-sm">해당 유저를 찾을 수 없습니다.</div>;
  }
  return (
    <div className="flex items-center gap-2 p-2 border rounded-md mb-2">
      <Avatar className="size-8">
        <AvatarImage src={searchResult.profilePhotoURL || ''} />
        <AvatarFallback>{searchResult.nickname?.[0] || '?'}</AvatarFallback>
      </Avatar>
      <span className="flex-1">{searchResult.nickname} ({searchResult.email})</span>
      <Button size="sm" onClick={() => onBlock(searchResult.uid, searchResult)} disabled={loading}>
        내 컨텐츠 숨김
      </Button>
    </div>
  );
}

export default function BlockedUsersPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmUnblockUid, setConfirmUnblockUid] = useState<string | null>(null);
  const [showSearchResult, setShowSearchResult] = useState(false);

  // 차단 목록 불러오기
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const user = await fetchUser(currentUser.uid);
      if (!user) return;
      if (!user.blockedUsers || user.blockedUsers.length === 0) {
        setBlockedUsers([]);
        return;
      }
      // 차단 유저 정보 fetch
      const users = await Promise.all(
        user.blockedUsers.map(uid => fetchUser(uid))
      );
      setBlockedUsers(users.filter(Boolean));
    })();
  }, [currentUser]);

  // 차단 추가
  const handleBlock = async (uid: string, userObj: any) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await addBlockedUser(currentUser.uid, uid);
      toast({ description: '내 컨텐츠 숨김 완료!' });
      setBlockedUsers(prev => [...prev, userObj]);
      setSearch('');
      setShowSearchResult(false);
    } catch (e) {
      toast({ description: '내 컨텐츠 숨김 중 오류가 발생했습니다.' });
    }
    setLoading(false);
  };

  // 차단 해제
  const handleUnblock = async (uid: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await removeBlockedUser(currentUser.uid, uid);
      toast({ description: '숨김 해제 완료!' });
      setBlockedUsers(prev => prev.filter(u => u.uid !== uid));
      setConfirmUnblockUid(null);
    } catch (e) {
      toast({ description: '숨김 해제 중 오류가 발생했습니다.' });
    }
    setLoading(false);
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setShowSearchResult(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSearchResult(true);
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center py-4 px-2">
      <header className="w-full max-w-md mx-auto flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          ←
        </Button>
        <h2 className="text-xl font-bold flex-1 text-center">접근 제어 관리</h2>
      </header>
      <section className="w-full max-w-md mx-auto mb-8">
        <h3 className="text-lg font-semibold mb-2">유저 내 컨텐츠 숨김</h3>
        <form className="flex gap-2 mb-2" onSubmit={handleSearchSubmit}>
          <Input
            placeholder="닉네임 또는 이메일 입력"
            value={search}
            onChange={handleSearchInput}
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !search}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          </Button>
        </form>
        {showSearchResult && search && (
          <Suspense fallback={<div className="flex items-center gap-2 p-2 border rounded-md mb-2"><Loader2 className="size-4 animate-spin mr-2" />검색 중...</div>}>
            <SearchResultWithSuspense
              search={search}
              boardPermissions={currentUser?.boardPermissions}
              onBlock={handleBlock}
              loading={loading}
            />
          </Suspense>
        )}
      </section>
      <section className="w-full max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-2">내 컨텐츠 숨김 유저 목록</h3>
        {blockedUsers.length === 0 ? (
          <div className="text-muted-foreground text-sm">내 컨텐츠를 숨긴 유저가 없습니다.</div>
        ) : (
          <ul className="space-y-2">
            {blockedUsers.map(user => (
              <li key={user.uid} className="flex items-center gap-2 p-2 border rounded-md">
                <Avatar className="size-8">
                  <AvatarImage src={user.profilePhotoURL || ''} />
                  <AvatarFallback>{user.nickname?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="flex-1">{user.nickname} ({user.email})</span>
                <AlertDialog open={confirmUnblockUid === user.uid}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => setConfirmUnblockUid(user.uid)}>
                      <UserX className="size-4 mr-1" /> 숨김 해제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>이 유저에 대한 내 컨텐츠 숨김을 해제하시겠습니까?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmUnblockUid(null)}>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleUnblock(user.uid)} className="bg-red-500 hover:bg-red-600">
                        숨김 해제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
} 