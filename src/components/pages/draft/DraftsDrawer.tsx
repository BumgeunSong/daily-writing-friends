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
import { DeleteDraftDialog } from './DeleteDraftDialog';
import { useDeleteDraft } from '@/hooks/useDeleteDraft';
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
      {/* 삭제 확인 대화상자 */}
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
      return boardTitle;
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
