import React, { useState, useEffect } from 'react';
import { Comment } from '@/types/Comment';
import { useAuth } from '../../../contexts/AuthContext';
import { firestore } from '../../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send } from 'lucide-react';
import addCommentToPost from '@/utils/commentUtils';

interface CommentsProps {
  postId: string;
}

const Comments: React.FC<CommentsProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const postRef = collection(firestore, 'posts', postId, 'comments');
    const commentsQuery = query(postRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
    }); 
    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !postId || !newComment.trim()) return;

    try {
      await addCommentToPost(postId, newComment, currentUser.uid, currentUser.displayName, currentUser.photoURL);
      setNewComment('');
    } catch (error) {
      console.error('댓글 추가 오류:', error);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <h2 className="text-xl font-semibold">댓글</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start space-x-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-semibold">{comment.userName}</p>
                <span className="text-xs text-muted-foreground">
                  {comment.createdAt.toDate().toLocaleString()}
                </span>
              </div>
              <p className="text-sm mt-1">{comment.content}</p>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        {currentUser && (
          <div className="mb-2">
            <p className="text-sm font-semibold">{currentUser.displayName}</p>
          </div>
        )}
        <form onSubmit={handleAddComment} className="w-full flex items-center space-x-2">
          <Input
            type="text"
            placeholder="댓글을 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default Comments;
