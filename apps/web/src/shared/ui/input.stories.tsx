import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';

const meta = {
  title: 'shared/ui/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: '닉네임을 입력하세요' },
  decorators: [(Story) => <div className="w-[320px]"><Story /></div>],
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true, value: '비활성' } };
export const WithLabel: Story = {
  render: (args) => (
    <div className="space-y-2">
      <Label htmlFor="nickname">닉네임</Label>
      <Input id="nickname" {...args} />
    </div>
  ),
};
export const TextareaField: Story = {
  render: () => <Textarea placeholder="내용을 입력하세요" className="min-h-[100px]" />,
};
