import { Quill as ReactQuillQuill } from 'react-quill-new';
import { VideoEmbed, validateVideoEmbed } from './model/VideoEmbed';

const BlockEmbed = ReactQuillQuill.import('blots/block/embed');

export class VideoBlot extends (BlockEmbed as any) {
  static blotName = 'video-thumb';
  static tagName = 'DIV';
  static className = 'ql-video-thumb';

  static create(value: VideoEmbed): HTMLElement {
    const node = super.create() as HTMLElement;

    const validatedValue = validateVideoEmbed(value);
    if (!validatedValue) {
      throw new Error('Invalid video embed data');
    }

    // Store video data as data attributes for editor functionality
    this.setVideoData(node, validatedValue);

    // Render full editor representation
    node.innerHTML = this.createEditorHTML(validatedValue);

    // Add event handlers for interaction
    this.addEventHandlers(node, validatedValue);

    return node;
  }

  private static setVideoData(node: HTMLElement, video: VideoEmbed): void {
    node.dataset.videoId = video.videoId;
    node.dataset.originalUrl = video.originalUrl;
    node.dataset.videoThumbnail = video.thumbnail;
    node.dataset.videoAspectRatio = video.aspectRatio;

    if (video.title) node.dataset.videoTitle = video.title;
    if (video.caption) node.dataset.videoCaption = video.caption;
    if (video.timestamp) node.dataset.videoTimestamp = video.timestamp.toString();
    if (video.duration) node.dataset.videoDuration = video.duration.toString();
  }

  private static createEditorHTML(video: VideoEmbed): string {
    // Use padding-bottom trick for aspect ratio that respects width constraints
    const paddingBottom = video.aspectRatio === '16:9' ? '56.25%' : '75%'; // 16:9 = 56.25%, 4:3 = 75%

    return `
      <div class="video-editor-container" style="position: relative; width: 100%; padding-bottom: ${paddingBottom};">
        <img
          src="${video.thumbnail}"
          alt="동영상 썸네일: ${video.title || 'YouTube 동영상'}"
          class="video-editor-thumbnail"
          loading="lazy"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
        />

        <div class="video-editor-overlay">
          <div class="video-editor-play-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>

          ${video.timestamp ? `
            <div class="video-editor-timestamp">
              ${this.formatTimestamp(video.timestamp)}에서 시작
            </div>
          ` : ''}
        </div>

        ${video.title || video.caption ? `
          <div class="video-editor-info">
            ${video.title ? `
              <div class="video-editor-title">${this.escapeHtml(video.title)}</div>
            ` : ''}
            ${video.caption ? `
              <div class="video-editor-caption">${this.escapeHtml(video.caption)}</div>
            ` : ''}
          </div>
        ` : ''}

        <div class="video-editor-selection-frame" style="display: none;">
          <div class="video-editor-toolbar">
            <button type="button" class="video-editor-btn video-editor-btn--delete" title="삭제">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private static formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private static addEventHandlers(node: HTMLElement, video: VideoEmbed): void {
    // Show/hide selection frame on click (not toolbar buttons)
    const mainClickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.video-editor-btn');
      const playButton = target.closest('.video-editor-play-button');

      if (button) {
        // Handle toolbar button clicks (delete)
        return;
      } else if (playButton) {
        // Handle play button clicks
        e.preventDefault();
        e.stopPropagation();
        VideoBlot.handlePreview(video);
      } else {
        // Handle general video clicks (show selection frame)
        e.preventDefault();
        VideoBlot.showSelectionFrame(node);
      }
    };
    node.addEventListener('click', mainClickHandler);

    // Handle focus
    node.addEventListener('focus', () => {
      VideoBlot.showSelectionFrame(node);
    });

    // Handle toolbar button clicks with proper event delegation
    const toolbarClickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.video-editor-btn');

      if (!button) return;

      e.preventDefault();
      e.stopPropagation();

      if (button.classList.contains('video-editor-btn--delete')) {
        VideoBlot.handleDelete(node);
      }
    };

    // Add the toolbar click handler to the toolbar container specifically
    const toolbar = node.querySelector('.video-editor-toolbar');
    if (toolbar) {
      toolbar.addEventListener('click', toolbarClickHandler);
    }

    // Keyboard navigation
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        VideoBlot.handlePreview(video);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        VideoBlot.handleDelete(node);
      }
    });

    // Make the node focusable for keyboard navigation
    node.tabIndex = 0;
  }

  private static showSelectionFrame(node: HTMLElement): void {
    // Hide other selection frames
    document.querySelectorAll('.video-editor-selection-frame').forEach(frame => {
      (frame as HTMLElement).style.display = 'none';
    });

    // Show this selection frame
    const frame = node.querySelector('.video-editor-selection-frame') as HTMLElement;
    if (frame) {
      frame.style.display = 'block';
    }

    // Add global click listener to hide frame
    const hideFrame = (e: Event) => {
      if (!node.contains(e.target as Node)) {
        frame.style.display = 'none';
        document.removeEventListener('click', hideFrame);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', hideFrame);
    }, 0);
  }

  private static handlePreview(video: VideoEmbed): void {
    // Open video in new tab for preview
    const watchUrl = `https://www.youtube.com/watch?v=${video.videoId}${video.timestamp ? `&t=${video.timestamp}` : ''}`;
    window.open(watchUrl, '_blank', 'noopener,noreferrer');
  }

  private static handleDelete(node: HTMLElement): void {
    // Trigger custom event for deletion
    const event = new CustomEvent('video-delete', {
      detail: { node },
      bubbles: true,
    });
    node.dispatchEvent(event);
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  ReactQuillQuill.register({ 'formats/video-thumb': VideoBlot }, true);
}