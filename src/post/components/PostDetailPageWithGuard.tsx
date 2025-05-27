import React from 'react';
import { useParams } from 'react-router-dom';
import { BoardPermissionGuard } from '@/shared/components/BoardPermissionGuard';
import PostDetailPage from './PostDetailPage';

export default function PostDetailPageWithGuard() {
  const { boardId } = useParams<{ boardId: string }>();
  if (!boardId) return <div>잘못된 경로입니다.</div>;
  return (
    <BoardPermissionGuard boardId={boardId}>
      <PostDetailPage />
    </BoardPermissionGuard>
  );
} 