import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';

interface TopNavigationBarProps {
  onBack?: () => void;
  rightContent?: React.ReactNode;
  className?: string;
}

export function TopNavigationBar({ onBack, rightContent, className = '' }: TopNavigationBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`bg-background py-3 ${className}`}>
      <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
        <div className="flex min-h-[44px] items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}