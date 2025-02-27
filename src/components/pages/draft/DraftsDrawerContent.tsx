import React from 'react';
import { Draft } from '@/types/Draft';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { DraftItem } from './DraftItem';

interface DraftsDrawerContentProps {
    isLoading: boolean;
    drafts: Draft[] | undefined;
    handleSelectDraft: (draft: Draft) => void;
    handleDeleteDraft: (draft: Draft, e: React.MouseEvent) => void;
}

export const DraftsDrawerContent: React.FC<DraftsDrawerContentProps> = ({
    isLoading,
    drafts,
    handleSelectDraft,
    handleDeleteDraft
}) => {
    return (
        <>
            {isLoading ? (
                <DraftsLoading />
            ) : !drafts || drafts.length === 0 ? (
                <EmptyDrafts />
            ) : (
                <DraftsList
                    drafts={drafts}
                    onSelectDraft={handleSelectDraft}
                    onDeleteDraft={handleDeleteDraft}
                />
            )}
        </>
    );
};


// 임시 저장 글 목록 컴포넌트
interface DraftsListProps {
    drafts: Draft[];
    onSelectDraft: (draft: Draft) => void;
    onDeleteDraft: (draft: Draft, e: React.MouseEvent) => void;
}

const DraftsList: React.FC<DraftsListProps> = ({
    drafts,
    onSelectDraft,
    onDeleteDraft
}) => (
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

// 로딩 컴포넌트
const DraftsLoading: React.FC = () => (
    <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">임시 저장 글을 불러오는 중...</span>
    </div>
);

// 임시 저장 글 없음 컴포넌트
const EmptyDrafts: React.FC = () => (
    <div className="py-8 text-center text-gray-500">
        저장된 임시 저장 글이 없습니다.
    </div>
);