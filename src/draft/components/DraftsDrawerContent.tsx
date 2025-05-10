import { Loader2 } from 'lucide-react';
import React from 'react';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Draft } from '@/types/Draft';
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
        <div role="region" aria-label="임시 저장 글 목록">
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
        </div>
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
        <div className="space-y-2" role="list">
            {drafts.map((draft) => (
                <div key={draft.id} role="listitem">
                    <DraftItem
                        draft={draft}
                        onClick={onSelectDraft}
                        onDelete={onDeleteDraft}
                    />
                </div>
            ))}
        </div>
    </ScrollArea>
);

// 로딩 컴포넌트
const DraftsLoading: React.FC = () => (
    <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <span className="ml-2 text-gray-600">임시 저장 글을 불러오는 중...</span>
    </div>
);

// 임시 저장 글 없음 컴포넌트
const EmptyDrafts: React.FC = () => (
    <div className="py-8 text-center text-gray-500" role="status" aria-live="polite">
        저장된 임시 저장 글이 없습니다.
    </div>
);