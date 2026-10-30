import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertDescription, AlertTitle } from './alert';

const meta = {
  title: 'shared/ui/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    children: (
      <>
        <AlertTitle>안내</AlertTitle>
        <AlertDescription>오늘의 글쓰기를 아직 하지 않았어요.</AlertDescription>
      </>
    ),
  },
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: (
      <>
        <AlertTitle>오류</AlertTitle>
        <AlertDescription>저장에 실패했어요. 잠시 후 다시 시도해주세요.</AlertDescription>
      </>
    ),
  },
};
