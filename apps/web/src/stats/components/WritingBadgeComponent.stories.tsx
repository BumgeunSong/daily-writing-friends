import type { Meta, StoryObj } from '@storybook/react-vite';
import { WritingBadgeComponent } from './WritingBadgeComponent';

const meta = {
  title: 'stats/WritingBadge',
  component: WritingBadgeComponent,
  tags: ['autodocs'],
  args: { badge: { name: '꾸준함', emoji: '🔥' } },
} satisfies Meta<typeof WritingBadgeComponent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
