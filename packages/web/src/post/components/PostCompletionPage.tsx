import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCompletionMessage } from '@/post/hooks/useCompletionMessage';
import { PostCompletionContent } from './PostCompletionContent';

export default function PostCompletionPage() {
  const navigate = useNavigate();
  const { boardId } = useParams();
  const [searchParams] = useSearchParams();
  const contentLength = Number(searchParams.get('contentLength')) || 0;

  const { titleMessage, contentMessage, highlight, iconType, isLoading } = useCompletionMessage(contentLength);

  const handleConfirm = () => {
    navigate(`/board/${boardId}`, { replace: true }); // Navigate back to board page
  };

  return (
    <PostCompletionContent
      titleMessage={titleMessage}
      contentMessage={contentMessage}
      highlight={highlight}
      iconType={iconType}
      isLoading={isLoading}
      onConfirm={handleConfirm}
    />
  );
}
