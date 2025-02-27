import React from 'react';
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
import { useBoardTitle } from '@/hooks/useBoardTitle';
import { useDrafts } from '@/hooks/useDrafts';
import { useDraftActions } from '@/hooks/useDraftActions';
import { useDrawer } from '@/hooks/useDrawer';
import { DraftsDrawerContent } from './DraftsDrawerContent';

// 메인 드로어 컴포넌트
interface DraftsDrawerProps {
  userId: string | undefined;
  boardId: string | undefined;
  children: React.ReactNode;
}

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

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DraftsDrawerHeader boardId={boardId} boardTitle={boardTitle} />
        <DraftsDrawerContent
          isLoading={isLoading}
          drafts={drafts}
          handleSelectDraft={handleSelectDraft}
          handleDeleteDraft={handleDeleteDraft}
        />
        <DraftsDrawerFooter />
      </DrawerContent>
    </Drawer>
  );
}

interface DraftsDrawerHeaderProps {
  boardId: string | undefined;
  boardTitle: string | undefined;
}

// 드로어 헤더 컴포넌트
const DraftsDrawerHeader: React.FC<DraftsDrawerHeaderProps> = ({ boardId, boardTitle }) => {
  const getDrawerTitle = () => {
    if (boardId && boardTitle) {
      return `${boardTitle} - 임시 저장 글`;
    }
    return '모든 임시 저장 글';
  };

  return (
    <DrawerHeader>
      <DrawerTitle>
        {getDrawerTitle()}
      </DrawerTitle>
    </DrawerHeader>
  );
};

// 드로어 푸터 컴포넌트
const DraftsDrawerFooter: React.FC = () => (
  <DrawerFooter>
    <DrawerClose asChild>
      <Button variant="outline">닫기</Button>
    </DrawerClose>
  </DrawerFooter>
);
