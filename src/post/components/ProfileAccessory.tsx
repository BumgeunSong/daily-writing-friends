import React from 'react';

interface ProfileAccessoryProps {
  children: React.ReactNode;
  className?: string;
  gradientClassName?: string; // 그라데이션 커스텀용
  size?: number; // px 단위, 기본 36px (9)
}

/**
 * 재사용 가능한 프로필 액세서리 컴포넌트
 * - 인스타그램 스타일 원형 그라데이션 border
 * - children(Avatar 등)을 감쌈
 * - size, gradientClassName 등 커스텀 지원
 */
const ProfileAccessory: React.FC<ProfileAccessoryProps> = ({
  children,
  className = '',
  gradientClassName = 'bg-gradient-to-tr from-orange-400 via-pink-500 to-purple-600',
  size = 36, // Tailwind size-9 = 36px
}) => {
  const innerSize = size - 8; // border 두께 4px 기준
  return (
    <span
      className={`block rounded-full flex items-center justify-center ${gradientClassName}`}
      style={{ width: size, height: size }}
    >
      <span
        className={`block rounded-full bg-white flex items-center justify-center overflow-hidden ${className}`}
        style={{ width: innerSize, height: innerSize }}
      >
        {children}
      </span>
    </span>
  );
};

export default ProfileAccessory; 