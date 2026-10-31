import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta = {
  title: 'shared/ui/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: '3주차' },
  argTypes: { variant: { control: 'select', options: ['default', 'secondary', 'destructive', 'outline'] } },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Outline: Story = { args: { variant: 'outline' } };
