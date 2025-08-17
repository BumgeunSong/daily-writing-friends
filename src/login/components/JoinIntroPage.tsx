import ActiveUserProfileList from '@/login/components/ActiveUserProfileList';
import CohortDetailsCard from '@/login/components/CohortDetailsCard';
import CountdownSection from '@/login/components/CountdownSection';
import GoalSection from '@/login/components/GoalSection';
import IntroCTA from '@/login/components/IntroCTA';
import IntroHeader from '@/login/components/IntroHeader';
import IntroHero from '@/login/components/IntroHero';
import { IntroPageLayout } from '@/login/components/IntroPageLayout';
import { IntroContentSection, SectionWrapper } from '@/login/components/IntroContentSection';
import ReviewCarousel from '@/login/components/ReviewCarousel';
import { useActiveUser } from '@/login/hooks/useActiveUser';
import { useUpcomingBoard } from '@/login/hooks/useUpcomingBoard';
import { useDaysUntilCohortStart } from '@/login/hooks/useDaysUntilCohortStart';
import { useGoogleLoginWithRedirect } from '@/login/hooks/useGoogleLoginWithRedirect';
import NoticeSection from '@/shared/components/NoticeSection';

export default function JoinIntroPage() {
  // Data hooks
  const { data: upcomingBoard } = useUpcomingBoard();
  const { data: activeUsers } = useActiveUser();

  // Business logic hooks
  const daysRemaining = useDaysUntilCohortStart(upcomingBoard?.firstDay);
  const { handleLogin, isLoading } = useGoogleLoginWithRedirect();

  return (
    <IntroPageLayout
      footer={
        <IntroCTA onLogin={handleLogin} cohort={upcomingBoard?.cohort} isLoading={isLoading} />
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
