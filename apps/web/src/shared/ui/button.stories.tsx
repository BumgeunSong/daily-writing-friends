import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

const meta = {
  title: 'shared/ui/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: '글쓰기' },
  argTypes: {
    variant: { control: 'select', options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'cta'] },
    size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CTA: Story = { args: { variant: 'cta' } };
export const Disabled: Story = { args: { disabled: true } };
