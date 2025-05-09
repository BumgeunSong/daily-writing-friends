import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { useIsCurrentUserActive } from '@/hooks/useIsCurrentUserActive';
 
export function JoinFormPageForActiveOrNewUser() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { isCurrentUserActive } = useIsCurrentUserActive();

  useEffect(() => {
    if (currentUser && isCurrentUserActive !== undefined) {
      // 기존 사용자는 active-user 페이지로, 신규 사용자는 new-user 페이지로 리다이렉트
      navigate(isCurrentUserActive ? '/join/form/active-user' : '/join/form/new-user', { replace: true });
    }
  }, [currentUser, isCurrentUserActive, navigate]);

  // 리다이렉트 전까지는 아무것도 렌더링하지 않음
  return null;
} 