import { Draft } from '@/types/Draft';
import { getDraftTitle, getDraftPreview, formatDraftDate } from '@/utils/draftUtils';
import { FileText, Clock, X } from 'lucide-react';

// 단일 임시 저장 글 항목 컴포넌트
interface DraftItemProps {
    draft: Draft;
    onClick: (draft: Draft) => void;
    onDelete: (draft: Draft, e: React.MouseEvent) => void;
}

export const DraftItem: React.FC<DraftItemProps> = ({ draft, onClick, onDelete }) => (
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
