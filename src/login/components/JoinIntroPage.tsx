import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/firebase';
import { useUpcomingBoard } from '@/login/hooks/useUpcomingBoard';
import IntroCTA from '@/login/components/IntroCTA';
import IntroHeader from '@/login/components/IntroHeader';
import IntroHero from '@/login/components/IntroHero';
import { useActiveUser } from '@/login/hooks/useActiveUser';
import ActiveUserProfileList from '@/login/components/ActiveUserProfileList';
import GoalSection from '@/login/components/GoalSection';
import CountdownSection from '@/login/components/CountdownSection';
import CohortDetailsCard from '@/login/components/CohortDetailsCard';
import NoticeSection from '@/shared/components/NoticeSection';

export default function JoinIntroPage() {
  const navigate = useNavigate();
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { data: upcomingBoard } = useUpcomingBoard();
  const { data: activeUsers } = useActiveUser();

  // Calculate days remaining until cohort starts
  useEffect(() => {
    if (upcomingBoard && upcomingBoard.firstDay) {
      const cohortStartDate = upcomingBoard.firstDay.toDate();
      const today = new Date();
      const timeDiff = cohortStartDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      setDaysRemaining(daysDiff);
    }
  }, [upcomingBoard]);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleJoin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      navigate('/join/form');
    } catch (error) {
      console.error('Error during sign-in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen justify-center bg-background'>
      {/* Center container with max-width */}
      <div className='relative flex w-full max-w-3xl flex-col pb-24 lg:max-w-4xl'>
        {/* Main content - scrollable */}
        <div className='flex-1 overflow-auto'>
          <IntroHeader onLogin={handleLogin} />
          <IntroHero />
          <div className='space-y-8 px-2 md:px-6'>
            {/* 목표 섹션 */}
            <GoalSection />

            {/* 카운트다운 섹션 */}
            <div className='px-0 md:px-4'>
              <div className='rounded-lg bg-muted/10 p-6'>
                <CountdownSection
                  daysRemaining={daysRemaining}
                  activeUserCount={activeUsers?.length}
                />
              </div>
            </div>

            {/* 활성 사용자 리스트 */}
            <ActiveUserProfileList users={activeUsers ?? []} />
            <div className='h-6' />

            {/* 코호트 상세/공지 섹션 */}
            <div className='px-4 md:px-4'>
              <div className='space-y-8 md:grid md:grid-cols-2 md:gap-8 md:space-y-0'>
                <CohortDetailsCard upcomingBoard={upcomingBoard} />
                <NoticeSection />
              </div>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className='h-12' />

        {/* Sticky CTA at bottom */}
        <IntroCTA onLogin={handleJoin} cohort={upcomingBoard?.cohort} isLoading={isLoading} />
      </div>
    </div>
  );
}
