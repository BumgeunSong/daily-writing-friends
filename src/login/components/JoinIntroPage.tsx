import ActiveUserProfileList from '@/login/components/ActiveUserProfileList';
import CohortDetailsCard from '@/login/components/CohortDetailsCard';
import CountdownSection from '@/login/components/CountdownSection';
import GoalSection from '@/login/components/GoalSection';
import { IntroContentSection, SectionWrapper } from '@/login/components/IntroContentSection';
import IntroCTA from '@/login/components/IntroCTA';
import IntroHeader from '@/login/components/IntroHeader';
import IntroHero from '@/login/components/IntroHero';
import { IntroPageLayout } from '@/login/components/IntroPageLayout';
import ReviewCarousel from '@/login/components/ReviewCarousel';
import { useActiveUser } from '@/login/hooks/useActiveUser';
import { useDaysUntilCohortStart } from '@/login/hooks/useDaysUntilCohortStart';
import { useGoogleLoginWithRedirect } from '@/login/hooks/useGoogleLoginWithRedirect';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useUpcomingBoard } from '@/login/hooks/useUpcomingBoard';
import NoticeSection from '@/shared/components/NoticeSection';
import { useAuth } from '@/shared/hooks/useAuth';

export default function JoinIntroPage() {
  // Data hooks
  const { data: upcomingBoard } = useUpcomingBoard();
  const { data: activeUsers } = useActiveUser();
  const { isInWaitingList, isLoading: isCheckingWaitingList } = useIsUserInWaitingList();
  const { currentUser } = useAuth();

  // Business logic hooks
  const daysRemaining = useDaysUntilCohortStart(upcomingBoard?.firstDay);
  const { handleLogin, isLoading: isLoginLoading } = useGoogleLoginWithRedirect();

  const isLoading = isLoginLoading || isCheckingWaitingList;
  const isLoggedIn = !!currentUser;

  return (
    <IntroPageLayout
      footer={
        <IntroCTA
          onLogin={handleLogin}
          cohort={upcomingBoard?.cohort}
          isLoading={isLoading}
          isInWaitingList={isInWaitingList}
          isLoggedIn={isLoggedIn}
        />
      }
    >
      <IntroHeader />
      <IntroHero />

      <IntroContentSection>
        <GoalSection />

        <SectionWrapper>
          <ReviewCarousel />
        </SectionWrapper>

        <SectionWrapper variant='highlighted'>
          <CountdownSection daysRemaining={daysRemaining} activeUserCount={activeUsers?.length} />
        </SectionWrapper>

        <ActiveUserProfileList users={activeUsers ?? []} />
        <div className='h-6' />

        <SectionWrapper variant='grid'>
          <CohortDetailsCard upcomingBoard={upcomingBoard} />
          <NoticeSection />
        </SectionWrapper>
      </IntroContentSection>
    </IntroPageLayout>
  );
}
