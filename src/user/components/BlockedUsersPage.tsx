import { useState, useEffect } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/shared/hooks/useAuth';
import { fetchUser, addBlockedUser, removeBlockedUser, fetchUsersWithBoardPermission } from '@/user/api/user';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/shared/ui/alert-dialog';
import { Loader2, UserX, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BlockedUsersPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmUnblockUid, setConfirmUnblockUid] = useState<string | null>(null);

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

  // 유저 검색
  const handleSearch = async () => {
    setLoading(true);
    setSearchResult(null);
    try {
      // 닉네임으로 검색 (간단 구현: board write 권한 유저 중에서만)
      const candidates = await fetchUsersWithBoardPermission(Object.keys(currentUser?.boardPermissions || {}));
      const found = candidates.find(u => u.nickname === search || u.email === search);
      if (found) {
        setSearchResult(found);
      } else {
        toast({ description: '해당 유저를 찾을 수 없습니다.' });
      }
    } catch (e) {
      toast({ description: '유저 검색 중 오류가 발생했습니다.' });
    }
    setLoading(false);
  };

  // 차단 추가
  const handleBlock = async (uid: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await addBlockedUser(currentUser.uid, uid);
      toast({ description: '차단 완료!' });
      setBlockedUsers(prev => [...prev, searchResult]);
      setSearch('');
      setSearchResult(null);
    } catch (e) {
      toast({ description: '차단 중 오류가 발생했습니다.' });
    }
    setLoading(false);
  };

  // 차단 해제
  const handleUnblock = async (uid: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await removeBlockedUser(currentUser.uid, uid);
      toast({ description: '차단 해제 완료!' });
      setBlockedUsers(prev => prev.filter(u => u.uid !== uid));
      setConfirmUnblockUid(null);
    } catch (e) {
      toast({ description: '차단 해제 중 오류가 발생했습니다.' });
    }
    setLoading(false);
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
        <h3 className="text-lg font-semibold mb-2">유저 차단하기</h3>
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="닉네임 또는 이메일 입력"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            disabled={loading}
          />
          <Button onClick={handleSearch} disabled={loading || !search}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          </Button>
        </div>
        {searchResult && (
          <div className="flex items-center gap-2 p-2 border rounded-md mb-2">
            <Avatar className="size-8">
              <AvatarImage src={searchResult.profilePhotoURL || ''} />
              <AvatarFallback>{searchResult.nickname?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <span className="flex-1">{searchResult.nickname} ({searchResult.email})</span>
            <Button size="sm" onClick={() => handleBlock(searchResult.uid)} disabled={loading}>
              차단
            </Button>
          </div>
        )}
      </section>
      <section className="w-full max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-2">차단한 유저 목록</h3>
        {blockedUsers.length === 0 ? (
          <div className="text-muted-foreground text-sm">차단한 유저가 없습니다.</div>
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
                      <UserX className="size-4 mr-1" /> 해제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>차단을 해제하시겠습니까?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmUnblockUid(null)}>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleUnblock(user.uid)} className="bg-red-500 hover:bg-red-600">
                        해제
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