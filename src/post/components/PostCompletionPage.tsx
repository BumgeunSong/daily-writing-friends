import { useNavigate, useParams } from 'react-router-dom';
import { useCompletionMessage } from '@/post/hooks/useCompletionMessage';
import { PostCompletionContent } from './PostCompletionContent';

export default function PostCompletionPage() {
  const navigate = useNavigate();
  const { boardId } = useParams();
  const { titleMessage, contentMessage, highlight, iconType, isLoading } = useCompletionMessage();

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
