import { useState, useEffect, useRef, useCallback } from 'react';
import { Play } from 'lucide-react';
import { VideoEmbed } from '../model/VideoEmbed';
import { generateEmbedUrl, formatTimestring } from '../utils/videoUtils';
import { getCachedThumbnail } from '../utils/thumbnailUtils';

interface VideoPlayerProps extends VideoEmbed {
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  lazy?: boolean;
}

/**
 * Performance-optimized video player with lazy loading and lite embed
 * Only loads full iframe when user interacts or when in viewport
 */
export function VideoPlayer({
  videoId,
  title,
  thumbnail: initialThumbnail,
  timestamp,
  caption,
  aspectRatio = '16:9',
  className = '',
  autoplay = false,
  controls = true,
  lazy = true,
}: VideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(!lazy);
  const [isIntersecting, setIsIntersecting] = useState(!lazy);
  const [thumbnail, setThumbnail] = useState(initialThumbnail);
  const [hasPreconnected, setHasPreconnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Fetch better thumbnail when in viewport
          getCachedThumbnail(videoId).then(result => {
            if (result.url !== thumbnail) {
              setThumbnail(result.url);
            }
          });
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // Start loading slightly before entering viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isLoaded, videoId, thumbnail]);

  // Preconnect to YouTube on hover or first interaction
  const handlePreconnect = useCallback(() => {
    if (hasPreconnected) return;

    // Add preconnect links for YouTube
    const preconnectUrls = [
      'https://www.youtube.com',
      'https://i.ytimg.com',
      'https://img.youtube.com'
    ];

    preconnectUrls.forEach(url => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });

    setHasPreconnected(true);
  }, [hasPreconnected]);

  const handlePlay = useCallback(() => {
    handlePreconnect();
    setIsLoaded(true);
  }, [handlePreconnect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlay();
    }
  }, [handlePlay]);

  // Generate embed URL with appropriate parameters
  const embedUrl = generateEmbedUrl(videoId, timestamp, {
    autoplay,
    controls,
    showinfo: false,
    rel: false,
  });

  // Calculate aspect ratio styles
  const aspectRatioStyle = {
    aspectRatio: aspectRatio === '16:9' ? '16/9' : '4/3',
  };

  // Full iframe player (loaded state)
  if (isLoaded) {
    return (
      <div
        ref={containerRef}
        className={`video-player video-player--loaded ${className}`}
        style={aspectRatioStyle}
      >
        <iframe
          src={embedUrl}
          title={title || 'YouTube video'}
          aria-label={caption || title || 'YouTube video'}
          allowFullScreen
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          className="video-player__iframe"
        />
      </div>
    );
  }

  // Lite embed (thumbnail with play button)
  return (
    <div
      ref={containerRef}
      className={`video-player video-player--lite ${className}`}
      style={aspectRatioStyle}
      onClick={handlePlay}
      onKeyDown={handleKeyDown}
      onMouseEnter={handlePreconnect}
      onFocus={handlePreconnect}
      tabIndex={0}
      role="button"
      aria-label={`재생: ${title || 'YouTube 동영상'}${timestamp ? ` (${formatTimestring(timestamp)}에서 시작)` : ''}`}
    >
      {isIntersecting && (
        <>
          <img
            src={thumbnail}
            alt={`동영상 썸네일: ${title || 'YouTube 동영상'}`}
            loading="lazy"
            className="video-player__thumbnail"
            onError={(e) => {
              // Fallback to default thumbnail if current one fails
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('default.jpg')) {
                target.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
              }
            }}
          />

          <div className="video-player__overlay">
            <div className="video-player__play-button">
              <Play className="video-player__play-icon" />
            </div>

            {timestamp && (
              <div className="video-player__timestamp">
                {formatTimestring(timestamp)}에서 시작
              </div>
            )}
          </div>

          {(title || caption) && (
            <div className="video-player__info">
              {title && (
                <div className="video-player__title">
                  {title}
                </div>
              )}
              {caption && (
                <div className="video-player__caption">
                  {caption}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!isIntersecting && (
        <div className="video-player__placeholder">
          <div className="video-player__placeholder-icon">
            <Play />
          </div>
        </div>
      )}
    </div>
  );
}

// CSS-in-JS styles for the component
const videoPlayerStyles = `
.video-player {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  margin: 1rem 0;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.video-player:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.video-player--loaded {
  cursor: default;
}

.video-player--loaded:hover {
  transform: none;
}

.video-player__iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
}

.video-player__thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-player__overlay {
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

.video-player:hover .video-player__overlay {
  background: rgba(0, 0, 0, 0.5);
}

.video-player__play-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.video-player:hover .video-player__play-button {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.video-player__play-icon {
  width: 32px;
  height: 32px;
  color: #333;
  margin-left: 4px; /* Offset for visual centering */
}

.video-player__timestamp {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.video-player__info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  padding: 24px 16px 16px;
  transform: translateY(100%);
  transition: transform 0.2s ease;
}

.video-player:hover .video-player__info {
  transform: translateY(0);
}

.video-player__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
}

.video-player__caption {
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.3;
}

.video-player__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f0f0f0;
  color: #666;
}

.video-player__placeholder-icon {
  width: 48px;
  height: 48px;
}

/* Focus styles for accessibility */
.video-player:focus {
  outline: 2px solid #007acc;
  outline-offset: 2px;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .video-player__play-button {
    width: 60px;
    height: 60px;
  }

  .video-player__play-icon {
    width: 24px;
    height: 24px;
  }

  .video-player__info {
    padding: 16px 12px 12px;
  }

  .video-player__title {
    font-size: 13px;
  }

  .video-player__caption {
    font-size: 11px;
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .video-player,
  .video-player__overlay,
  .video-player__play-button,
  .video-player__info {
    transition: none;
  }

  .video-player:hover {
    transform: none;
  }
}
`;

// Inject styles into document head
if (typeof document !== 'undefined' && !document.querySelector('#video-player-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'video-player-styles';
  styleSheet.textContent = videoPlayerStyles;
  document.head.appendChild(styleSheet);
}