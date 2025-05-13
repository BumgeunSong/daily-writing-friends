import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';

interface UserProfileProps {
  userId: string;
}

interface UserData {
  nickname: string;
  bio: string;
  profileImage: string;
}

export default function UserProfile({
  userId,
}: UserProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const isCurrentUser = currentUser?.uid === userId;

  // 사용자 데이터 가져오기 (임시로 더미 데이터 사용)
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      
      // 임시 데이터 - 실제 구현 시 API 호출로 대체
      setTimeout(() => {
        setUserData({
          nickname: '글벗이',
          bio: '매일 쓰는 글쓰기의 즐거움을 발견하는 중입니다. 함께 글을 쓰며 성장해요!',
          profileImage: '',
        });
        setLoading(false);
      }, 500);
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);
  
  const handleEditProfile = () => {
    navigate('/account/edit', { 
      state: { 
        userData: {
          uid: userId,
          nickname: userData?.nickname,
          profilePhotoURL: userData?.profileImage,
          bio: userData?.bio
        },
        from: 'userProfile'
      } 
    });
  };

  if (loading) {
    return (
      <div className="border-b bg-background p-4">
        <div className="relative mb-4 flex items-start">
          {/* 사용자 정보 스켈레톤 */}
          <div className="flex-1">
            <Skeleton className="mb-2 h-6 w-32" />
            <Skeleton className="mb-1 h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          
          {/* 프로필 이미지 스켈레톤 */}
          <Skeleton className="size-16 rounded-full" />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-center py-2">
          <p className="text-sm text-muted-foreground">사용자 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const { nickname, bio, profileImage } = userData;

  return (
    <div className="border-b bg-background p-4">
      <div className="relative mb-4 flex items-start">
        {/* 프로필 이미지 - 모바일에서는 왼쪽, 데스크탑에서는 오른쪽에 배치 */}
        <div className="mr-4 sm:hidden">
          {profileImage ? (
            <img
              src={profileImage}
              alt={`${nickname}의 프로필 사진`}
              className="size-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border border-border bg-muted">
              <span className="text-lg font-medium text-muted-foreground">
                {nickname.charAt(0)}
              </span>
            </div>
          )}
        </div>
        
        {/* 사용자 정보 */}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{nickname}</h1>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {bio || '소개글이 없습니다.'}
          </p>
        </div>

        {/* 프로필 이미지 - 모바일에서는 숨기고 데스크탑에서는 오른쪽에 표시 */}
        <div className="hidden sm:block">
          {profileImage ? (
            <img
              src={profileImage}
              alt={`${nickname}의 프로필 사진`}
              className="size-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border border-border bg-muted">
              <span className="text-lg font-medium text-muted-foreground">
                {nickname.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* 프로필 수정 버튼 - 현재 사용자인 경우에만 표시 */}
      {isCurrentUser && (
        <Button
          variant="outline"
          className="mt-2 w-full border-border"
          onClick={handleEditProfile}
        >
          프로필 수정
        </Button>
      )}
    </div>
  );
} 