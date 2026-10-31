import type { Meta, StoryObj } from '@storybook/react-vite';
import { PostSubmitButton } from './PostSubmitButton';

const meta = {
  title: 'post/PostSubmitButton',
  component: PostSubmitButton,
  tags: ['autodocs'],
  args: { isSubmitting: false },
} satisfies Meta<typeof PostSubmitButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Submitting: Story = { args: { isSubmitting: true } };
export const Disabled: Story = { args: { disabled: true } };
