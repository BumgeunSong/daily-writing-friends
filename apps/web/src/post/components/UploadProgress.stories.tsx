import type { Meta, StoryObj } from '@storybook/react-vite';
import { UploadProgress } from './UploadProgress';

const meta = {
  title: 'post/UploadProgress',
  component: UploadProgress,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { stage: 'uploading', uploadProgress: 45 },
  argTypes: { stage: { control: 'select', options: ['idle', 'converting', 'resizing', 'uploading'] } },
  decorators: [(Story) => <div className="relative h-48 w-[400px] rounded-lg border"><Story /></div>],
} satisfies Meta<typeof UploadProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Uploading: Story = {};
export const Converting: Story = { args: { stage: 'converting', uploadProgress: 0 } };
export const Resizing: Story = { args: { stage: 'resizing', uploadProgress: 0 } };
