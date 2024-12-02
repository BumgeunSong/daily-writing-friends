import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '@/types/Notification';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { fetchPostTitle } from '@/utils/postUtils';
import { fetchUserNickname } from '@/utils/userUtils';
import { NotificationMessage } from './NotificationMessage';
interface NotificationItemProps {
  notification: Notification;
}

function getNotificationLink(notification: Notification): string {
  return `/board/${notification.boardId}/post/${notification.postId}`;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const [postTitle, setPostTitle] = useState('');
  const [userNickName, setUserNickName] = useState('');

  useEffect(() => {
    getPostTitle(notification.boardId, notification.postId).then(setPostTitle);
    getUserNickName(notification.fromUserId).then(setUserNickName);
  }, [notification]);

  return (
    <Link to={getNotificationLink(notification)}>
      <div
        className={`flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-all hover:bg-accent/50 ${!notification.read ? 'bg-accent/30' : ''
          }`}
      >
        <Avatar>
          <AvatarImage src={notification.fromUserProfileImage} alt="User Avatar" />
          <AvatarFallback>
            {notification.fromUserId.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className='flex-1 space-y-1'>
          <p className='text-sm font-medium leading-tight text-foreground'>
            <NotificationMessage userNickName={userNickName} postTitle={postTitle} notificationType={notification.type} />
          </p>
          <span className='text-[11px] text-muted-foreground/80'>
            {notification.timestamp.toDate().toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
};

const getPostTitle = async (boardId: string, postId: string) => {
  const postTitle = await fetchPostTitle(boardId, postId);
  return postTitle || '';
};

const getUserNickName = async (userId: string) => {
  const userNickName = await fetchUserNickname(userId);
  return userNickName || '';
};
