import type { Meta, StoryObj } from '@storybook/react-vite';
import CommentSkeleton from './CommentSkeleton';

const meta = {
  title: 'comment/CommentSkeleton',
  component: CommentSkeleton,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
} satisfies Meta<typeof CommentSkeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Comment: Story = {};
