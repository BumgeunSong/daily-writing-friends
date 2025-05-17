import { useParams, useNavigate } from 'react-router-dom';
import { useRemoteConfig } from '@shared/hooks/useRemoteConfig';
import UserProfile from './UserProfile';
import UserPostsTab from './UserPostsTab';
import { Menu } from 'lucide-react';

export default function UserPage() {
  const userPageEnabled = useRemoteConfig('user_page_enabled', false);
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  if (!userPageEnabled) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">사용자 페이지가 비활성화되었습니다.</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">사용자를 찾을 수 없습니다.</p>
      </div>
    );
  }

  // 설정(프로필 편집) 페이지로 이동
  const handleGoToSettings = () => {
    navigate('/account/edit');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      {/* 헤더 섹션 */}
      <header className="sticky top-0 z-10 bg-background shadow-sm">
        {/* 설정 메뉴 아이콘: 헤더 최상단 우측에 고정 */}
        <button
          className="absolute right-4 top-4 z-20 rounded p-2 transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-6 lg:right-8"
          aria-label="설정으로 이동"
          onClick={handleGoToSettings}
        >
          <Menu className="size-6 text-muted-foreground" />
        </button>
        <div className="relative mx-auto flex max-w-3xl items-start gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <UserProfile userId={userId} />
        </div>
        <hr className="border-border/40" />
      </header>
      {/* 메인 콘텐츠: 모바일은 세로, 데스크탑은 가로 분할 */}
      <main className="container mx-auto flex-1 px-0 sm:px-4 lg:max-w-3xl lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-8">
          {/* 데스크탑에서는 프로필이 왼쪽, 포스트 리스트가 오른쪽 */}
          <section className="block lg:hidden">
            {/* 모바일에서는 이미 위에서 렌더링됨 */}
          </section>
          <section className="flex-1">
            <UserPostsTab userId={userId} />
          </section>
        </div>
      </main>
    </div>
  );
} 