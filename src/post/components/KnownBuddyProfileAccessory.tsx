import React from 'react';
import ProfileAccessory from './ProfileAccessory';

interface KnownBuddyProfileAccessoryProps {
  children: React.ReactNode;
  className?: string;
  // 필요시 추가 커스텀 prop
}

/**
 * 내 known buddy임을 강조하는 전용 액세서리 컴포넌트
 * - ProfileAccessory를 감싸고, 추가적인 ring/badge/애니메이션 등 시각적 강조
 */
const KnownBuddyProfileAccessory: React.FC<KnownBuddyProfileAccessoryProps> = ({
  children,
  className = '',
}) => {
  return (
    <ProfileAccessory
      gradientClassName="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 animate-spin-slow"
      size={40}
      className={className}
    >
      {/* 예시: 오른쪽 하단에 별 아이콘 badge */}
      <span className="relative block">
        {children}
        <span className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-md">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-white">
            <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.955L10 0l2.951 5.955 6.561.955-4.756 4.635 1.122 6.545z" />
          </svg>
        </span>
      </span>
    </ProfileAccessory>
  );
};

export default KnownBuddyProfileAccessory; 