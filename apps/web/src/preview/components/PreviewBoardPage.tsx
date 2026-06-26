import { PreviewBoardHeader } from '@/preview/components/PreviewBoardHeader';
import { PreviewJoinCTA } from '@/preview/components/PreviewJoinCTA';
import { PreviewPostCardList } from '@/preview/components/PreviewPostCardList';

/**
 * Public preview board (design doc §3, §4). Mimics `BoardPage`'s shell — header
 * + scrollable card list — but is fully static and read-only: no filter tabs,
 * no writing FAB, no data fetching. Lives at `/preview` under `publicRoutes`.
 *
 * The bottom CTA closes the funnel by routing back to `/join`.
 */
export default function PreviewBoardPage() {
  return (
    <div className="min-h-screen bg-background">
      <PreviewBoardHeader />
      <main className="container mx-auto px-3 py-2 pb-24 md:px-4">
        <PreviewPostCardList />
        <PreviewJoinCTA />
      </main>
    </div>
  );
}
