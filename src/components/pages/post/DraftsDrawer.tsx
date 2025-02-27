import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDrafts } from '@/utils/draftUtils';
import { fetchBoardTitle } from '@/utils/boardUtils';
import { Draft } from '@/types/Draft';
import { Loader2, FileText, Clock, ChevronRight } from 'lucide-react';
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

// 초안 날짜 포맷팅 - 사용자의 로케일 기반
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

// 초안 제목 표시 (비어있으면 '제목 없음' 표시)
const getDraftTitle = (draft: Draft) => {
  return draft.title.trim() ? draft.title : '(제목 없음)';
};

// 초안 내용 미리보기 (최대 50자)
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
    <span className="ml-2 text-gray-600">초안을 불러오는 중...</span>
  </div>
);

// 초안 없음 컴포넌트
const EmptyDrafts = () => (
  <div className="py-8 text-center text-gray-500">
    저장된 초안이 없습니다.
  </div>
);

// 단일 초안 항목 컴포넌트
interface DraftItemProps {
  draft: Draft;
  onClick: (draft: Draft) => void;
}

const DraftItem = ({ draft, onClick }: DraftItemProps) => (
  <div 
    onClick={() => onClick(draft)}
    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
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
      <ChevronRight className="h-5 w-5 text-gray-400" />
    </div>
    <div className="flex items-center mt-2 text-xs text-gray-500">
      <Clock className="h-3 w-3 mr-1" />
      {formatDraftDate(draft.savedAt)}
    </div>
  </div>
);

// 초안 목록 컴포넌트
interface DraftsListProps {
  drafts: Draft[];
  onSelectDraft: (draft: Draft) => void;
}

const DraftsList = ({ drafts, onSelectDraft }: DraftsListProps) => (
  <ScrollArea className="h-[60vh] px-4">
    <div className="space-y-2">
      {drafts.map((draft) => (
        <DraftItem 
          key={draft.id} 
          draft={draft} 
          onClick={onSelectDraft} 
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
  const [boardTitle, setBoardTitle] = useState<string>('');
  
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
  
  // 초안 목록 가져오기
  const { data: drafts, isLoading } = useQuery({
    queryKey: ['drafts', userId, boardId],
    queryFn: async () => {
      if (!userId) return [];
      return boardId 
        ? await getDrafts(userId, boardId) 
        : await getDrafts(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1분 동안 캐시 유지
  });
  
  // 초안 선택 핸들러
  const handleSelectDraft = (draft: Draft) => {
    navigate(`/board/${draft.boardId}/create?draftId=${draft.id}`);
  };
  
  // 드로어 제목 생성
  const getDrawerTitle = () => {
    if (boardId && boardTitle) {
      return boardTitle;
    }
    return '모든 초안';
  };

  // 드로어 내용 렌더링
  const renderDrawerContent = () => {
    if (isLoading) {
      return <DraftsLoading />;
    }
    
    if (!drafts || drafts.length === 0) {
      return <EmptyDrafts />;
    }
    
    return <DraftsList drafts={drafts} onSelectDraft={handleSelectDraft} />;
  };

  return (
    <Drawer>
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