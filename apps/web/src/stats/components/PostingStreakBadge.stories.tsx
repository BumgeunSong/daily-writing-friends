import type { Meta, StoryObj } from '@storybook/react-vite';
import { PostingStreakBadge } from './PostingStreakBadge';

const meta = {
  title: 'stats/PostingStreakBadge',
  component: PostingStreakBadge,
  tags: ['autodocs'],
  args: { streak: [true, true, false, true, true] },
} satisfies Meta<typeof PostingStreakBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { isLoading: true, streak: undefined } };
export const AllMissed: Story = { args: { streak: [false, false, false, false, false] } };
