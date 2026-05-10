import { CalendarDays, Clock, PenLine, AlignLeft, MessageCircle } from 'lucide-react';
import type { Board } from '@/board/model/Board';
import { Card } from '@/shared/ui/card';

interface CohortConfirmCardProps {
  upcomingBoard: Board;
  agreed: boolean;
  onAgreedChange: (next: boolean) => void;
}

export default function CohortConfirmCard({
  upcomingBoard,
  agreed,
  onAgreedChange,
}: CohortConfirmCardProps) {
  const dateRange =
    upcomingBoard.firstDay && upcomingBoard.lastDay
      ? `${upcomingBoard.firstDay.toDate().toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })} - ${upcomingBoard.lastDay.toDate().toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric',
        })}`
      : null;

  return (
    <Card className='space-y-4 bg-muted/30 p-6'>
      <div className='flex items-start justify-between gap-3'>
        <h2 className='text-balance text-lg font-bold md:text-xl'>
          매글프 {upcomingBoard.cohort}기를 신청합니다
        </h2>
        <label
          htmlFor='cohort-agree'
          className='-m-2 flex shrink-0 cursor-pointer items-center p-2'
        >
          <span className='sr-only'>매글프 {upcomingBoard.cohort}기 신청에 동의합니다</span>
          <input
            id='cohort-agree'
            type='checkbox'
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className='size-6 cursor-pointer rounded accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          />
        </label>
      </div>

      <ul className='space-y-3 text-sm md:text-base'>
        {dateRange && (
          <li className='flex items-center gap-2'>
            <CalendarDays className='size-5 text-muted-foreground' />
            <span>{dateRange}</span>
          </li>
        )}
        <li className='flex items-center gap-2'>
          <Clock className='size-5 text-muted-foreground' />
          <span>4주간</span>
        </li>
        <li className='flex items-center gap-2'>
          <PenLine className='size-5 text-muted-foreground' />
          <span>총 20개의 글</span>
        </li>
        <li className='flex items-center gap-2'>
          <AlignLeft className='size-5 text-muted-foreground' />
          <span>글 최소 분량 3줄</span>
        </li>
        <li className='flex items-center gap-2'>
          <MessageCircle className='size-5 text-muted-foreground' />
          <span>하루에 댓글 1개 달기</span>
        </li>
      </ul>
    </Card>
  );
}
