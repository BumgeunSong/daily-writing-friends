import type React from 'react';

export type PostFilterType = 'recent' | 'best';

interface PostFilterTabsProps {
  selected: PostFilterType;
  onChange: (filter: PostFilterType) => void;
}

/**
 * 게시글 필터 탭 컴포넌트 (카카오톡 Friends/Feed 스타일)
 */
const PostFilterTabs: React.FC<PostFilterTabsProps> = ({ selected, onChange }) => {
  return (
    <div className="inline-flex rounded-full bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange('recent')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selected === 'recent'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        최근
      </button>
      <button
        type="button"
        onClick={() => onChange('best')}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selected === 'best'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        베스트
      </button>
    </div>
  );
};

export default PostFilterTabs;
