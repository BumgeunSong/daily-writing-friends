import { useParams } from 'react-router-dom';
import UserProfile from './UserProfile';
import UserActivityTab from './UserActivityTab';
import { useAuth } from '@/contexts/AuthContext';

export default function UserPage() {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser } = useAuth();

  if (!userId) {
    return (
      <div className="flex justify-center items-center py-20">
        <p className="text-muted-foreground">사용자를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      {/* 헤더 섹션 */}
      <header className="sticky top-0 z-10 bg-background shadow-sm">
        <UserProfile userId={userId} />
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 container mx-auto px-4">
        <UserActivityTab userId={userId} />
      </main>
    </div>
  );
} 