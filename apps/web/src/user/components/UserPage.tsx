import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import StatusMessage from '@/shared/components/StatusMessage';
import { useRegisterTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { useAuth } from '@/shared/hooks/useAuth';
import { UserPageHeader } from '@/user/components/UserPageHeader';
import { UserPostSearchView } from '@/user/components/UserPostSearchView';
import UserPostsList from '@/user/components/UserPostList';
import UserProfile from '@/user/components/UserProfile';

const SESSION_KEY_PREFIX = 'userPostSearch:';
const sessionKey = (userId: string) => `${SESSION_KEY_PREFIX}${userId}`;

interface SearchSession {
  isSearchMode: boolean;
  query: string;
}

const EMPTY_SESSION: SearchSession = { isSearchMode: false, query: '' };

function readSearchSession(userId: string): SearchSession {
  try {
    const raw = sessionStorage.getItem(sessionKey(userId));
    if (!raw) return EMPTY_SESSION;
    const parsed = JSON.parse(raw);
    return {
      isSearchMode: parsed?.isSearchMode === true,
      query: typeof parsed?.query === 'string' ? parsed.query : '',
    };
  } catch {
    return EMPTY_SESSION;
  }
}

function writeSearchSession(userId: string, session: SearchSession) {
  try {
    sessionStorage.setItem(sessionKey(userId), JSON.stringify(session));
  } catch {
    // best-effort: sessionStorage may be unavailable (private mode, quota)
  }
}

function clearSearchSession(userId: string) {
  try {
    sessionStorage.removeItem(sessionKey(userId));
  } catch {
    // ignore
  }
}

export default function UserPage() {
  const { userId: paramUserId } = useParams();
  const { currentUser } = useAuth();
  const userId = paramUserId || currentUser?.uid;
  const isMyPage = userId !== undefined && currentUser?.uid === userId;

  const initialSession = useMemo<SearchSession>(
    () => (userId && isMyPage ? readSearchSession(userId) : EMPTY_SESSION),
    [userId, isMyPage],
  );
  const [isSearchMode, setIsSearchMode] = useState(initialSession.isSearchMode);
  const [persistedQuery, setPersistedQuery] = useState(initialSession.query);

  // `useState` initializers run only on first mount. React Router keeps the
  // same `UserPage` instance mounted when only `:userId` changes, so navigating
  // between users would otherwise carry stale `isSearchMode` / `persistedQuery`
  // into the next user's view. Reseed state from sessionStorage (or the empty
  // session for other users' pages) whenever the page identity flips.
  const lastIdentityRef = useRef<string>(`${userId ?? ''}|${isMyPage ? '1' : '0'}`);
  useEffect(() => {
    const nextIdentity = `${userId ?? ''}|${isMyPage ? '1' : '0'}`;
    if (nextIdentity === lastIdentityRef.current) return;
    lastIdentityRef.current = nextIdentity;
    const next = userId && isMyPage ? readSearchSession(userId) : EMPTY_SESSION;
    setIsSearchMode(next.isSearchMode);
    setPersistedQuery(next.query);
  }, [userId, isMyPage]);

  // Ref-callback approach for focus return: when the header re-mounts after an exit,
  // the callback fires with the button node; the transient flag drives the single
  // focus call. No useEffect needed.
  const shouldRestoreFocus = useRef(false);
  const searchIconRefCallback = useCallback((node: HTMLButtonElement | null) => {
    if (node && shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      node.focus();
    }
  }, []);

  useRegisterTabHandler(
    'User',
    useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []),
  );

  const handleEnterSearch = useCallback(() => {
    if (!userId || !isMyPage) return;
    setIsSearchMode(true);
    writeSearchSession(userId, { isSearchMode: true, query: persistedQuery });
  }, [userId, isMyPage, persistedQuery]);

  const handleExitSearch = useCallback(() => {
    if (!userId) return;
    shouldRestoreFocus.current = true;
    setIsSearchMode(false);
    clearSearchSession(userId);
  }, [userId]);

  const handleQueryChange = useCallback(
    (q: string) => {
      setPersistedQuery(q);
      if (userId && isMyPage) {
        writeSearchSession(userId, { isSearchMode: true, query: q });
      }
    },
    [userId, isMyPage],
  );

  if (!userId) {
    return <StatusMessage errorMessage='유저 정보를 찾을 수 없습니다.' />;
  }

  return (
    <div className='min-h-screen bg-background'>
      {isSearchMode && isMyPage ? (
        <UserPostSearchView
          userId={userId}
          initialQuery={persistedQuery}
          onQueryChange={handleQueryChange}
          onExitSearch={handleExitSearch}
        />
      ) : (
        <>
          <UserPageHeader
            ref={searchIconRefCallback}
            isMyPage={isMyPage}
            isSearchMode={isSearchMode}
            onToggleSearch={handleEnterSearch}
          />
          <main className='container mx-auto px-3 py-2 pb-16 md:px-4'>
            <div className='mb-2'>
              <UserProfile uid={userId} />
            </div>
            <UserPostsList userId={userId} />
          </main>
        </>
      )}
    </div>
  );
}
