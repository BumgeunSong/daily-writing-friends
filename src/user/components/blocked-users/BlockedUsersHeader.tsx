import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export function BlockedUsersHeader() {
  return (
    <header className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="size-5" />
      </Button>
      <div>
        <h1 className="text-2xl font-bold">비공개 사용자 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          비공개 사용자에게는 내 콘텐츠가 보이지 않습니다
        </p>
      </div>
    </header>
  );
}
