import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PostTextEditor } from './PostTextEditor';
import { PostTitleEditor } from './PostTitleEditor';
import { PostBackButton } from './PostBackButton';
import CountdownWritingTimer from './PostCountdownWritingTimer';
import { WritingStatus } from '@/types/WritingStatus';
import { createPost } from '@/utils/postUtils';
import { useToast } from '@/hooks/use-toast';
import { PostSubmitButton } from './PostSubmitButton';

export default function PostCountdownCreationPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const { toast } = useToast();
  
  // 상태 관리
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerStatus, setTimerStatus] = useState<WritingStatus>(WritingStatus.Writing);
  const [isExpired, setIsExpired] = useState(false);
  
  // 타이핑 감지를 위한 타임아웃 ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 타이머 만료 처리
  const handleTimerExpire = () => {
    setIsExpired(true);
    toast({
      title: "프리라이팅 성공!",
      description: "목표 시간을 달성했습니다. 이제 글을 업로드할 수 있어요.",
      variant: "default"
    });
  };
  
  // 텍스트 변경 시 타이핑 감지
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // 타이핑 중이면 WritingStatus를 Writing으로 설정
    setTimerStatus(WritingStatus.Writing);
    
    // 이전 타임아웃이 있으면 제거
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // 2초 동안 타이핑이 없으면 Paused로 설정
    typingTimeoutRef.current = setTimeout(() => {
      // 만료되지 않았을 때만 일시 정지 상태로 변경
      if (!isExpired) {
        setTimerStatus(WritingStatus.Paused);
      }
    }, 2000);
  };

  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  // 제목 변경 시도 같은 패턴 적용
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    setTimerStatus(WritingStatus.Writing);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      // 만료되지 않았을 때만 일시 정지 상태로 변경
      if (!isExpired) {
        setTimerStatus(WritingStatus.Paused);
      }
    }, 2000);
  };
  
  // 게시물 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !boardId) return;
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await createPost(
        boardId,
        title,
        content,
        currentUser.uid,
        currentUser.displayName || '익명'
      );
      
      toast({
        title: "업로드 완료",
        description: "프리라이팅으로 쓴 글은 다른 사람에게 보이지 않아요."
      });
      
      navigate(`/boards/${boardId}`);
    } catch (error) {
      console.error('게시 중 오류:', error);
      toast({
        title: "업로드 실패",
        description: "글을 업로드하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 카운트다운 타이머 - 컨테이너 외부에 배치 */}
      <CountdownWritingTimer
        status={timerStatus}
        expired={isExpired}
        onExpire={handleTimerExpire}
        totalTime={5 * 60} // 5분 (테스트용, 필요에 따라 조정)
      />
      
      <div className='mx-auto max-w-4xl px-6 sm:px-8 lg:px-12 pb-8 pt-6'>
        <div className="mb-6">
          {boardId && <PostBackButton boardId={boardId} />}
        </div>
        
        <form onSubmit={handleSubmit} className='space-y-6'>
          <PostTitleEditor
            value={title}
            onChange={handleTitleChange}
            className='mb-4'
          />
          
          <PostTextEditor 
            value={content}
            onChange={handleContentChange}
          />
          
          <div className='flex justify-between items-center'>
            <PostSubmitButton 
              isSubmitting={isSubmitting}
              disabled={!isExpired || !title.trim() || !content.trim()}
              label={isExpired ? "업로드하기" : "아직 시간이 남았어요"}
              submittingLabel="업로드 중..."
            />
          </div>
        </form>
      </div>
    </>
  );
}