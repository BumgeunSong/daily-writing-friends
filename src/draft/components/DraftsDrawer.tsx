import React from 'react';
import { useBoardTitle } from '@/board/hooks/useBoardTitle';
import { useDrawer } from '@/comment/hooks/useDrawer';
import { useDeleteDraft } from '@/draft/hooks/useDeleteDraft';
import { useDraftActions } from '@/draft/hooks/useDraftActions';
import { useDrafts } from '@/draft/hooks/useDrafts';
import { Button } from '@shared/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@shared/ui/drawer";
import { DeleteDraftDialog } from './DeleteDraftDialog';
import { DraftsDrawerContent } from './DraftsDrawerContent';

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
  const { handleSelectDraft } = useDraftActions({ userId, onClose: handleClose });
  // 삭제 로직 훅
  const {
    isDeleteDialogOpen,
    draftToDelete,
    isDeleting,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete
  } = useDeleteDraft({
    userId,
    onDeleteSuccess: refetch // 삭제 성공 시 목록 새로고침
  });

  return (
    <>
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
            handleDeleteDraft={openDeleteDialog}
          />
          <DraftsDrawerFooter />
        </DrawerContent>
      </Drawer>
      <DeleteDraftDialog
        isOpen={isDeleteDialogOpen}
        draft={draftToDelete}
        isDeleting={isDeleting}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
      />
    </>
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
