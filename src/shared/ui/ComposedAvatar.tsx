import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { User as UserIcon } from 'lucide-react';

interface ComposedAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: number; // px 단위, Tailwind size-9=36px
  className?: string;
}

const ComposedAvatar: React.FC<ComposedAvatarProps> = ({
  src,
  alt = 'User',
  fallback = 'U',
  size = 36,
  className = '',
  ...rest
}) => {
  return (
    <Avatar className={className} style={{ width: size, height: size }} {...rest}>
      <AvatarImage src={src || ''} alt={alt} />
      <AvatarFallback>
        {fallback.length === 1 ? fallback : <UserIcon className="size-3.5" />}
      </AvatarFallback>
    </Avatar>
  );
};

export default ComposedAvatar; 