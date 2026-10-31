import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReadingColumn } from './reading-column';
import { Row } from './row';
import { Stack } from './stack';

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded bg-muted px-3 py-2 text-sm">{children}</div>
);

const meta = {
  title: 'shared/ui/Layout',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const StackGaps: Story = {
  render: () => (
    <div className="space-y-6 p-6">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((gap) => (
        <Stack key={gap} gap={gap}>
          <Box>gap={gap} - 1</Box>
          <Box>gap={gap} - 2</Box>
        </Stack>
      ))}
    </div>
  ),
};

export const RowAlignment: Story = {
  render: () => (
    <div className="space-y-4 p-6">
      <Row justify="between"><Box>왼쪽</Box><Box>오른쪽</Box></Row>
      <Row justify="center" gap="lg"><Box>가운데</Box><Box>정렬</Box></Row>
    </div>
  ),
};

export const ReadingColumnWidth: Story = {
  render: () => (
    <ReadingColumn as="div">
      <Stack>
        <Box>본문 컬럼 (max-w-2xl)</Box>
        <Box>헤더, 본문, 댓글이 같은 폭에 정렬됩니다.</Box>
      </Stack>
    </ReadingColumn>
  ),
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
