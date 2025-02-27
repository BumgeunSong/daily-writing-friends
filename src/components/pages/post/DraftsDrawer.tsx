import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDrafts, deleteDraft } from '@/utils/draftUtils';
import { fetchBoardTitle } from '@/utils/boardUtils';
import { Draft } from '@/types/Draft';
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
import { toast } from '@/hooks/use-toast';

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

export function DraftsDrawer({ userId, boardId, children }: DraftsDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [boardTitle, setBoardTitle] = useState<string>('');
  const [open, setOpen] = useState(false);
  
  // 게시판 제목 가져오기
  useEffect(() => {
    const fetchTitle = async () => {
      if (boardId) {
        const title = await fetchBoardTitle(boardId);
        setBoardTitle(title);
      }
    };
    
    fetchTitle();
  }, [boardId]);
  
  // 임시 저장 글 목록 가져오기
  const { data: drafts, isLoading, refetch } = useQuery({
    queryKey: ['drafts', userId, boardId],
    queryFn: async () => {
      if (!userId) return [];
      return boardId 
        ? await getDrafts(userId, boardId) 
        : await getDrafts(userId);
    },
    enabled: !!userId,
    cacheTime: 0, // 캐시 사용하지 않음
    staleTime: 0, // 항상 최신 데이터 가져오기
  });
  
  // 임시 저장 글 선택 핸들러 - React Query 캐시에 미리 저장
  const handleSelectDraft = (draft: Draft) => {
    // 캐시에 임시 저장 글 데이터 미리 저장
    if (userId) {
      queryClient.setQueryData(['draft', userId, draft.id, draft.boardId], draft);
      
      // 쿼리 무효화하여 새 페이지에서 다시 실행되도록 함
      queryClient.invalidateQueries({
        queryKey: ['draft', userId, draft.id, draft.boardId],
        exact: true,
        refetchType: 'none' // 즉시 리페치하지 않고 다음 렌더링에서 실행되도록 함
      });
    }
    
    // 드로어 닫기
    setOpen(false);
    
    // URL 파라미터로 임시 저장 글 ID 전달
    navigate(`/create/${draft.boardId}?draftId=${draft.id}`);
  };
  
  // 임시 저장 글 삭제 핸들러
  const handleDeleteDraft = async (draft: Draft, e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 요소의 클릭 이벤트 전파 방지
    
    if (!userId) return;
    
    try {
      // 임시 저장 글 삭제
      await deleteDraft(userId, draft.id);
      
      // 캐시에서도 삭제
      queryClient.removeQueries({
        queryKey: ['draft', userId, draft.id, draft.boardId],
        exact: true
      });
      
      // 임시 저장 글 목록 다시 불러오기
      refetch();
    } catch (error) {
      console.error('임시 저장 글 삭제 중 오류 발생:', error);
      
      // 오류 메시지 표시
      toast({
        title: "임시 저장 글 삭제 실패",
        description: "임시 저장 글을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
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