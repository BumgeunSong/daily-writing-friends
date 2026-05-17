import { User as UserIcon } from 'lucide-react';
import type React from 'react';
import { cn } from '@/shared/utils/cn';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

interface ComposedAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: number; // px 단위, Tailwind size-9=36px
  className?: string;
  loading?: 'lazy' | 'eager';
}

// Hostname check (not substring): `url.includes('googleusercontent.com')` would
// also match attacker-controlled URLs that embed the string anywhere in the path
// or query (CodeQL: incomplete URL substring sanitization).
function isGoogleAvatarUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    return hostname === 'googleusercontent.com' || hostname.endsWith('.googleusercontent.com');
  } catch {
    return false;
  }
}

function appendGoogleAvatarSizeParam(url: string, size: number): string {
  if (isGoogleAvatarUrl(url) && !url.includes('=s')) {
    return `${url}=s${size}`;
  }
  return url;
}

const ComposedAvatar: React.FC<ComposedAvatarProps> = ({
  src,
  alt = 'User',
  fallback = 'U',
  size = 36,
  className = '',
  loading = 'lazy',
  ...rest
}) => {
  // Firebase Storage URLs are now served at the correct size (256x256) because
  // the upload pipeline pre-resizes via resizeImageBlob. Google avatar URLs still
  // need the size hint because they come pre-sized from the OAuth provider.
  const renderSrc = src ? (isGoogleAvatarUrl(src) ? appendGoogleAvatarSizeParam(src, size) : src) : '';

  return (
    <Avatar className={cn('ring-1 ring-black/10 dark:ring-white/10', className)} style={{ width: size, height: size }} {...rest}>
      {renderSrc && <AvatarImage src={renderSrc} alt={alt} loading={loading} decoding="async" />}
      <AvatarFallback>
        {fallback ? fallback : <UserIcon className="size-3.5" />}
      </AvatarFallback>
    </Avatar>
  );
};

export default ComposedAvatar;
