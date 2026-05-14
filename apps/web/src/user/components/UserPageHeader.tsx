import { Menu, Search } from 'lucide-react';
import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserPageHeaderProps {
  isMyPage: boolean;
  isSearchMode: boolean;
  onToggleSearch: () => void;
}

export const UserPageHeader = forwardRef<HTMLButtonElement, UserPageHeaderProps>(
  function UserPageHeader({ isMyPage, isSearchMode, onToggleSearch }, searchIconRef) {
    const navigate = useNavigate();

    const handleGoToSettings = () => {
      navigate('/user/settings');
    };

    if (!isMyPage || isSearchMode) {
      return null;
    }

    return (
      <header className='bg-background py-3'>
        <div className='container mx-auto flex items-center justify-between px-3 md:px-4'>
          <div className='flex min-h-[44px] items-center space-x-2 rounded-lg p-2'>
            <span className='text-xl font-semibold tracking-tight text-foreground md:text-2xl'>
              내 프로필
            </span>
          </div>
          <div className='flex items-center gap-1'>
            <button
              ref={searchIconRef}
              type='button'
              onClick={onToggleSearch}
              aria-label='내 글 검색'
              aria-pressed={isSearchMode}
              className='reading-hover reading-focus flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-foreground transition-[transform,background-color] duration-200 active:scale-[0.99]'
            >
              <Search className='size-4 md:size-5' />
            </button>
            <button
              onClick={handleGoToSettings}
              className='reading-hover reading-focus flex min-h-[44px] items-center space-x-2 rounded-lg p-2 text-foreground transition-[transform,background-color] duration-200 active:scale-[0.99]'
              aria-label='Go to user settings'
            >
              <Menu className='size-4 md:size-5' />
            </button>
          </div>
        </div>
      </header>
    );
  },
);
