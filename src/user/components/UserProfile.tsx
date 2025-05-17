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
      <div className="flex flex-row items-center gap-4 py-2 sm:gap-6 lg:gap-8">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center py-2">
        <p className="text-sm text-muted-foreground">사용자 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { nickname, bio, profileImage } = userData;

  return (
    <div className="flex flex-row items-center gap-4 py-2 sm:gap-6 lg:gap-8">
      {/* 프로필 사진 */}
      {profileImage ? (
        <img
          src={profileImage}
          alt={`${nickname}의 프로필 사진`}
          className="size-16 rounded-full border border-border object-cover bg-muted"
        />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-full border border-border bg-muted">
          <span className="text-lg font-medium text-muted-foreground">
            {nickname.charAt(0)}
          </span>
        </div>
      )}
      {/* 닉네임/소개글 */}
      <div className="flex flex-col justify-center">
        <span className="text-lg font-bold text-foreground">{nickname}</span>
        <span className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {bio || '소개글이 없습니다.'}
        </span>
      </div>
    </div>
  );
} 