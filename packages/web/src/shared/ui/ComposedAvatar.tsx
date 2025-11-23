import { User as UserIcon } from 'lucide-react';
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

interface ComposedAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: number; // px 단위, Tailwind size-9=36px
  className?: string;
}

function appendGoogleAvatarSizeParam(url: string, size: number): string {
  if (url.includes('googleusercontent.com') && !url.includes('=s')) {
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
  ...rest
}) => {
  const optimizedSrc = src ? appendGoogleAvatarSizeParam(src, size) : '';

  return (
    <Avatar className={className} style={{ width: size, height: size }} {...rest}>
      <AvatarImage src={optimizedSrc} alt={alt} loading="lazy" decoding="async" />
      <AvatarFallback>
        {fallback.length === 1 ? fallback : <UserIcon className="size-3.5" />}
      </AvatarFallback>
    </Avatar>
  );
};

export default ComposedAvatar; 