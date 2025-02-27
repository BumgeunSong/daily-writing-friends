import React from 'react';
import { Loader2, FileText, Clock, X } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Draft } from '@/types/Draft';
import { useBoardTitle } from '@/hooks/useBoardTitle';
import { useDrafts } from '@/hooks/useDrafts';
import { useDraftActions } from '@/hooks/useDraftActions';
import { useDrawer } from '@/hooks/useDrawer';

export function DraftsDrawer({ userId, boardId, children }: DraftsDrawerProps) {
    // 훅 사용
    const { open, setOpen, handleClose } = useDrawer();
    const { boardTitle } = useBoardTitle(boardId);
    const { drafts, isLoading, refetch } = useDrafts(userId, boardId);
    const { handleSelectDraft, handleDeleteDraft } = useDraftActions({
      userId,
      onClose: handleClose,
      refetchDrafts: refetch
    });
    
    // 드로어 제목 생성
    const getDrawerTitle = () => {
      if (boardId && boardTitle) {
        return `${boardTitle} - 임시 저장 글`;
      }
      return '모든 임시 저장 글';
    };
  
    // 드로어 내용 렌더링
    const renderDrawerContent = () => {
      if (isLoading) {
        return <DraftsLoading />;
      }
      
      if (!drafts || drafts.length === 0) {
        return <EmptyDrafts />;
      }
      
      return (
        <DraftsList 
          drafts={drafts} 
          onSelectDraft={handleSelectDraft} 
          onDeleteDraft={handleDeleteDraft}
        />
      );
    };
  
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>
              {getDrawerTitle()}
            </DrawerTitle>
          </DrawerHeader>
          {renderDrawerContent()}
          <DrawerFooterContent />
        </DrawerContent>
      </Drawer>
    );
  } 
  
// 임시 저장 글 날짜 포맷팅 - 사용자의 로케일 기반
const formatDraftDate = (timestamp: any) => {
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat(navigator.language || 'ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// 임시 저장 글 제목 표시 (비어있으면 '제목 없음' 표시)
const getDraftTitle = (draft: Draft) => {
  return draft.title.trim() ? draft.title : '(제목 없음)';
};

// 임시 저장 글 내용 미리보기 (최대 50자)
const getDraftPreview = (draft: Draft) => {
  const plainText = draft.content.replace(/<[^>]*>/g, ''); // HTML 태그 제거
  return plainText.length > 50 
    ? plainText.substring(0, 50) + '...' 
    : plainText || '(내용 없음)';
};

// 로딩 컴포넌트
const DraftsLoading = () => (
  <div className="flex justify-center items-center py-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="ml-2 text-gray-600">임시 저장 글을 불러오는 중...</span>
  </div>
);

// 임시 저장 글 없음 컴포넌트
const EmptyDrafts = () => (
  <div className="py-8 text-center text-gray-500">
    저장된 임시 저장 글이 없습니다.
  </div>
);

// 단일 임시 저장 글 항목 컴포넌트
interface DraftItemProps {
  draft: Draft;
  onClick: (draft: Draft) => void;
  onDelete: (draft: Draft, e: React.MouseEvent) => void;
}

const DraftItem = ({ draft, onClick, onDelete }: DraftItemProps) => (
  <div 
    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors relative"
  >
    {/* 삭제 버튼 */}
    <button
      onClick={(e) => onDelete(draft, e)}
      className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
      aria-label="임시 저장 글 삭제"
    >
      <X className="h-4 w-4 text-gray-500" />
    </button>
    
    {/* 클릭 영역 */}
    <div 
      onClick={() => onClick(draft)}
      className="pr-6" // 삭제 버튼을 위한 여백
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium flex items-center">
            <FileText className="h-4 w-4 mr-1 text-gray-500" />
            {getDraftTitle(draft)}
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {getDraftPreview(draft)}
          </p>
        </div>
      </div>
      <div className="flex items-center mt-2 text-xs text-gray-500">
        <Clock className="h-3 w-3 mr-1" />
        {formatDraftDate(draft.savedAt)}
      </div>
    </div>
  </div>
);

// 임시 저장 글 목록 컴포넌트
interface DraftsListProps {
  drafts: Draft[];
  onSelectDraft: (draft: Draft) => void;
  onDeleteDraft: (draft: Draft, e: React.MouseEvent) => void;
}

const DraftsList = ({ drafts, onSelectDraft, onDeleteDraft }: DraftsListProps) => (
  <ScrollArea className="h-[60vh] px-4">
    <div className="space-y-2">
      {drafts.map((draft) => (
        <DraftItem 
          key={draft.id} 
          draft={draft} 
          onClick={onSelectDraft}
          onDelete={onDeleteDraft}
        />
      ))}
    </div>
  </ScrollArea>
);

// 드로어 푸터 컴포넌트
const DrawerFooterContent = () => (
  <DrawerFooter>
    <DrawerClose asChild>
      <Button variant="outline">닫기</Button>
    </DrawerClose>
  </DrawerFooter>
);

// 메인 드로어 컴포넌트
interface DraftsDrawerProps {
  userId: string | undefined;
  boardId: string | undefined;
  children: React.ReactNode;
}
