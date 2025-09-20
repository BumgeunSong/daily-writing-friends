import Quill from 'quill';
import { VideoEmbed, validateVideoEmbed } from '../../model/VideoEmbed';
import { formatTimestring } from '../../utils/videoUtils';

const BlockEmbed = Quill.import('blots/block/embed');

/**
 * Custom Quill blot for video embeds with structured data storage
 * Stores video data in Quill Delta format and renders as interactive thumbnail
 */
class VideoBlot extends BlockEmbed {
  static blotName = 'video';
  static tagName = 'div';
  static className = 'ql-video-embed';

  static create(value: VideoEmbed): HTMLElement {
    console.log('🎬 [VideoBlot] Creating video blot with value:', value);

    const node = super.create() as HTMLElement;
    const validatedValue = validateVideoEmbed(value);

    console.log('🎬 [VideoBlot] Validated value:', validatedValue);

    if (!validatedValue) {
      console.error('🎬 [VideoBlot] Invalid video embed data:', value);
      throw new Error('Invalid video embed data');
    }

    // Store video data as data attributes for editor functionality
    console.log('🎬 [VideoBlot] Setting video data on node');
    this.setVideoData(node, validatedValue);

    // Render editor representation
    console.log('🎬 [VideoBlot] Creating editor HTML');
    node.innerHTML = this.createEditorHTML(validatedValue);

    // Add event handlers for interaction
    console.log('🎬 [VideoBlot] Adding event handlers');
    this.addEventHandlers(node, validatedValue);

    console.log('🎬 [VideoBlot] Video blot created successfully:', node);
    return node;
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
    const aspectRatioStyle = video.aspectRatio === '16:9' ? 'aspect-ratio: 16/9' : 'aspect-ratio: 4/3';

    return `
      <div class="video-editor-container" style="${aspectRatioStyle}">
        <img
          src="${video.thumbnail}"
          alt="동영상 썸네일: ${video.title || 'YouTube 동영상'}"
          class="video-editor-thumbnail"
          loading="lazy"
        />

        <div class="video-editor-overlay">
          <div class="video-editor-play-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>

          ${video.timestamp ? `
            <div class="video-editor-timestamp">
              ${formatTimestring(video.timestamp)}에서 시작
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
            <button type="button" class="video-editor-btn video-editor-btn--preview" title="미리보기">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </button>
            <button type="button" class="video-editor-btn video-editor-btn--edit" title="URL 변경">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
              </svg>
            </button>
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

  private static addEventHandlers(node: HTMLElement, video: VideoEmbed): void {
    // Show/hide selection frame on focus/blur
    node.addEventListener('click', (e) => {
      e.preventDefault();
      this.showSelectionFrame(node);
    });

    node.addEventListener('focus', () => {
      this.showSelectionFrame(node);
    });

    // Handle toolbar actions
    node.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.video-editor-btn');

      if (!button) return;

      e.preventDefault();
      e.stopPropagation();

      if (button.classList.contains('video-editor-btn--preview')) {
        this.handlePreview(video);
      } else if (button.classList.contains('video-editor-btn--edit')) {
        this.handleEdit(node, video);
      } else if (button.classList.contains('video-editor-btn--delete')) {
        this.handleDelete(node);
      }
    });

    // Keyboard navigation
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handlePreview(video);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.handleDelete(node);
      }
    });
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

  private static handleEdit(node: HTMLElement, video: VideoEmbed): void {
    // Trigger custom event for URL editing
    const event = new CustomEvent('video-edit', {
      detail: { node, video },
      bubbles: true,
    });
    node.dispatchEvent(event);
  }

  private static handleDelete(node: HTMLElement): void {
    // Trigger custom event for deletion
    const event = new CustomEvent('video-delete', {
      detail: { node },
      bubbles: true,
    });
    node.dispatchEvent(event);

    // Remove the blot
    const blot = Quill.find(node);
    if (blot) {
      blot.remove();
    }
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// CSS styles for the video blot
const videoBlotStyles = `
.ql-video-embed {
  position: relative;
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  outline: none;
}

.ql-video-embed:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.ql-video-embed:focus {
  outline: 2px solid #007acc;
  outline-offset: 2px;
}

.video-editor-container {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-editor-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-editor-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.2s ease;
}

.ql-video-embed:hover .video-editor-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.video-editor-play-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  color: #333;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.ql-video-embed:hover .video-editor-play-button {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.video-editor-timestamp {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.video-editor-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 20px 12px 12px;
  transform: translateY(100%);
  transition: transform 0.2s ease;
}

.ql-video-embed:hover .video-editor-info {
  transform: translateY(0);
}

.video-editor-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
}

.video-editor-caption {
  font-size: 11px;
  opacity: 0.9;
  line-height: 1.3;
}

.video-editor-selection-frame {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid #007acc;
  border-radius: 10px;
  pointer-events: none;
}

.video-editor-toolbar {
  position: absolute;
  top: -36px;
  right: 0;
  display: flex;
  gap: 4px;
  background: white;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
}

.video-editor-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.video-editor-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.video-editor-btn:focus {
  outline: 2px solid #007acc;
  outline-offset: 1px;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .video-editor-play-button {
    width: 48px;
    height: 48px;
  }

  .video-editor-toolbar {
    top: -32px;
    gap: 2px;
    padding: 2px;
  }

  .video-editor-btn {
    width: 24px;
    height: 24px;
  }

  .video-editor-btn svg {
    width: 12px;
    height: 12px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .ql-video-embed,
  .video-editor-overlay,
  .video-editor-play-button,
  .video-editor-info,
  .video-editor-btn {
    transition: none;
  }

  .ql-video-embed:hover {
    transform: none;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined' && !document.querySelector('#video-blot-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'video-blot-styles';
  styleSheet.textContent = videoBlotStyles;
  document.head.appendChild(styleSheet);
}

export default VideoBlot;