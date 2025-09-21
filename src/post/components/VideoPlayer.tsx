import { VideoEmbed } from '../model/VideoEmbed';
import { generateEmbedUrl } from '../utils/videoUtils';

interface VideoPlayerProps extends VideoEmbed {
  className?: string;
}

/**
 * Simple YouTube iframe player for viewer mode
 * Direct embed without lazy loading or thumbnails
 */
export function VideoPlayer({
  videoId,
  title,
  timestamp,
  aspectRatio = '16:9',
  className = '',
}: VideoPlayerProps) {
  // Generate embed URL with timestamp
  const embedUrl = generateEmbedUrl(videoId, timestamp, {
    autoplay: false,
    controls: true,
    showinfo: false,
    rel: false,
  });

  // Calculate aspect ratio styles
  const aspectRatioStyle = {
    aspectRatio: aspectRatio === '16:9' ? '16/9' : '4/3',
  };

  return (
    <div
      className={`video-player-simple ${className}`}
      style={aspectRatioStyle}
    >
      <iframe
        src={embedUrl}
        title={title || 'YouTube video'}
        allowFullScreen
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        className="video-player-simple__iframe"
      />
    </div>
  );
}

// Minimal CSS styles for simple iframe player
const videoPlayerStyles = `
.video-player-simple {
  position: relative;
  width: 100%;
  margin: 1rem 0;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.video-player-simple__iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .video-player-simple {
    margin: 1rem -1rem; /* Extend to screen edges on mobile */
    border-radius: 0;
  }
}
`;

// Inject styles into document head
if (typeof document !== 'undefined' && !document.querySelector('#video-player-simple-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'video-player-simple-styles';
  styleSheet.textContent = videoPlayerStyles;
  document.head.appendChild(styleSheet);
}