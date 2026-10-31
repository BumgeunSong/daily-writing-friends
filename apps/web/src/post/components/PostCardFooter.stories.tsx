import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '@/shared/ui/card';
import { PostCardFooter } from './PostCardFooter';

const meta = {
  title: 'post/PostCardFooter',
  component: PostCardFooter,
  tags: ['autodocs'],
  args: { countOfComments: 3, countOfReplies: 2, weekDaysFromFirstDay: 4 },
  decorators: [(Story) => <Card className="w-[360px]"><Story /></Card>],
} satisfies Meta<typeof PostCardFooter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoWeekBadge: Story = { args: { weekDaysFromFirstDay: undefined } };
export const NoComments: Story = { args: { countOfComments: 0, countOfReplies: 0 } };
