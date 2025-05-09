import { useParams } from 'react-router-dom';
import { useRemoteConfig } from '@/hooks/useRemoteConfig';
import UserActivityTab from './UserActivityTab';
import UserProfile from './UserProfile';

export default function UserPage() {
  const userPageEnabled = useRemoteConfig('user_page_enabled', false);
  const { userId } = useParams<{ userId: string }>();

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

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      {/* 헤더 섹션 */}
      <header className="sticky top-0 z-10 bg-background shadow-sm">
        <UserProfile userId={userId} />
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto flex-1 px-4">
        <UserActivityTab userId={userId} />
      </main>
    </div>
  );
} 