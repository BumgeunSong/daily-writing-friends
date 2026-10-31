import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

const meta = {
  title: 'shared/ui/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>오늘의 글쓰기</CardTitle>
        <CardDescription>매일 조금씩, 함께 써요.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">카드 본문 영역입니다.</p>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">푸터</p>
      </CardFooter>
    </Card>
  ),
};
