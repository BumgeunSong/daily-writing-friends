import { CalendarDays, Clock, PenLine, AlignLeft, MessageCircle } from 'lucide-react';
import type { Board } from '@/board/model/Board';
import { Card } from '@/shared/ui/card';

interface CohortSummaryCardProps {
  upcomingBoard: Board;
}

const PROGRAM_RULES = [
  { Icon: Clock, text: '4주간' },
  { Icon: PenLine, text: '총 20개의 글' },
  { Icon: AlignLeft, text: '글 최소 분량 3줄' },
  { Icon: MessageCircle, text: '하루에 댓글 1개 달기' },
];

export default function CohortSummaryCard({ upcomingBoard }: CohortSummaryCardProps) {
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
      <h2 className='text-sm font-medium text-muted-foreground'>이렇게 진행돼요</h2>

      {dateRange && (
        <p className='flex items-center gap-2 text-base font-semibold md:text-lg'>
          <CalendarDays className='size-5 shrink-0 text-muted-foreground' />
          <span>{dateRange}</span>
        </p>
      )}

      <ul className='space-y-3 text-sm text-muted-foreground'>
        {PROGRAM_RULES.map(({ Icon, text }) => (
          <li key={text} className='flex items-center gap-2'>
            <Icon className='size-4 shrink-0' />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
