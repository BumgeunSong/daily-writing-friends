import { FileText, Clock, X } from 'lucide-react';
import { Draft } from '@/draft/model/Draft';
import { getDraftTitle, getDraftPreview, formatDraftDate } from '@/draft/utils/draftUtils';

// 단일 임시 저장 글 항목 컴포넌트
interface DraftItemProps {
    draft: Draft;
    onClick: (draft: Draft) => void;
    onDelete: (draft: Draft, e: React.MouseEvent) => void;
}

export const DraftItem: React.FC<DraftItemProps> = ({ draft, onClick, onDelete }) => (
    <div
        className="relative cursor-pointer rounded-lg border p-3 transition-colors hover:bg-gray-50"
        role="article"
    >
        <button
            onClick={(e) => onDelete(draft, e)}
            className="absolute right-2 top-2 rounded-full p-1 transition-colors hover:bg-gray-200"
            aria-label={`${getDraftTitle(draft)} 임시 저장 글 삭제`}
        >
            <X className="size-4 text-gray-500" />
        </button>

        <div
            onClick={() => onClick(draft)}
            className="pr-6" // 삭제 버튼을 위한 여백
            role="button"
            tabIndex={0}
            aria-label={`${getDraftTitle(draft)} 임시 저장 글 열기`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onClick(draft);
                }
            }}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center font-medium">
                        <FileText className="mr-1 size-4 text-gray-500" aria-hidden="true" />
                        {getDraftTitle(draft)}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {getDraftPreview(draft)}
                    </p>
                </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-500">
                <Clock className="mr-1 size-3" aria-hidden="true" />
                <span>{formatDraftDate(draft.savedAt)}</span>
            </div>
        </div>
    </div>
);
