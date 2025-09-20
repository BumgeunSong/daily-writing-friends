import { Quill as ReactQuillQuill } from 'react-quill-new';
import { VideoEmbed, validateVideoEmbed } from './model/VideoEmbed';

// Always extend the SAME BlockEmbed from the SAME instance
const BlockEmbed = ReactQuillQuill.import('blots/block/embed');

export class VideoBlot extends BlockEmbed {
  static blotName = 'video-thumb';
  static tagName = 'DIV';
  static className = 'ql-video-thumb';

  static create(value: VideoEmbed): HTMLElement {
    console.log('🎬 [VideoBlot] create() called with value:', value);

    try {
      const node = super.create() as HTMLElement;
      console.log('🎬 [VideoBlot] Super.create() completed');

      const validatedValue = validateVideoEmbed(value);
      if (!validatedValue) {
        console.error('🎬 [VideoBlot] Invalid video embed data:', value);
        throw new Error('Invalid video embed data');
      }

      // Set attributes safely
      node.setAttribute('data-video-id', validatedValue.videoId);
      node.setAttribute('data-video-title', validatedValue.title || 'YouTube Video');
      node.setAttribute('contenteditable', 'false');

      // Apply styles directly
      node.style.aspectRatio = '16 / 9';
      node.style.background = '#f0f0f0';
      node.style.display = 'flex';
      node.style.alignItems = 'center';
      node.style.justifyContent = 'center';
      node.style.padding = '20px';
      node.style.borderRadius = '8px';
      node.style.border = '1px solid #ddd';
      node.style.fontSize = '14px';
      node.style.color = '#666';

      // Use textContent for safety
      node.textContent = `🎬 Video: ${validatedValue.videoId} | Title: ${validatedValue.title || 'No title'}`;

      console.log('🎬 [VideoBlot] Video blot created successfully');
      return node;
    } catch (error) {
      console.error('🎬 [VideoBlot] Error in create():', error);
      throw error;
    }
  }

  static value(domNode: HTMLElement): VideoEmbed | null {
    try {
      const videoData: VideoEmbed = {
        type: 'youtube',
        videoId: domNode.dataset.videoId || '',
        originalUrl: domNode.dataset.originalUrl || '',
        title: domNode.dataset.videoTitle || undefined,
        thumbnail: domNode.dataset.videoThumbnail || '',
        caption: domNode.dataset.videoCaption || undefined,
        timestamp: domNode.dataset.videoTimestamp ? parseInt(domNode.dataset.videoTimestamp, 10) : undefined,
        aspectRatio: (domNode.dataset.videoAspectRatio as any) || '16:9',
        duration: domNode.dataset.videoDuration ? parseInt(domNode.dataset.videoDuration, 10) : undefined,
      };

      return validateVideoEmbed(videoData);
    } catch {
      return null;
    }
  }
}

// Guard against duplicate registration in dev/HMR
const already = (ReactQuillQuill as any).imports?.['formats/video-thumb'];
if (!already) {
  console.log('🎬 [QuillRegister] Registering VideoBlot');
  ReactQuillQuill.register({ 'formats/video-thumb': VideoBlot }, true);

  // Verify registration
  const imported = ReactQuillQuill.import('formats/video-thumb');
  console.log('🎬 [QuillRegister] Registration complete. Identity check:', imported === VideoBlot);
  console.log('🎬 [QuillRegister] Blot name:', (imported as any)?.blotName);
} else {
  console.log('🎬 [QuillRegister] VideoBlot already registered, skipping');
}