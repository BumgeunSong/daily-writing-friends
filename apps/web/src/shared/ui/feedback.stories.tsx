import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress } from './progress';
import { Skeleton } from './skeleton';
import PostCardSkeleton from './PostCardSkeleton';

const meta = {
  title: 'shared/ui/Feedback',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ProgressBar: Story = {
  render: () => <Progress value={60} className="h-2 w-[320px]" />,
};
export const SkeletonLines: Story = {
  render: () => (
    <div className="w-[320px] space-y-2">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ),
};
export const PostCard: Story = {
  render: () => (
    <div className="w-[360px]">
      <PostCardSkeleton />
    </div>
  ),
};
