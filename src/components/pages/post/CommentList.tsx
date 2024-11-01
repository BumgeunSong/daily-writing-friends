import React, { useEffect, useState } from 'react'
import { Comment } from '../../../types/Comment'
import { onSnapshot, orderBy, query, collection } from 'firebase/firestore'
import { firestore } from '@/firebase'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle } from 'lucide-react'
import ReplyInput from './ReplyInput'

interface CommentListProps {
  postId: string
}

const CommentList: React.FC<CommentListProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  useEffect(() => {
    const postRef = collection(firestore, 'posts', postId, 'comments')
    const commentsQuery = query(postRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[]
      setComments(fetchedComments)
    })

    return () => unsubscribe()
  }, [postId])

  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId)
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex flex-col space-y-2">
          <div className="flex items-start space-x-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={comment.userProfileImage} alt={comment.userName} />
              <AvatarFallback>{comment.userName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="font-semibold">{comment.userName}</p>
                <span className="text-xs text-muted-foreground">
                  {comment.createdAt?.toDate().toLocaleString()}
                </span>
              </div>
              <p className="text-sm mt-1">{comment.content}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => handleReply(comment.id)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {replyingTo === comment.id ? '취소' : '답글'}
              </Button>
            </div>
          </div>
          {replyingTo === comment.id && (
            <ReplyInput 
              postId={postId} 
              commentId={comment.id} 
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default CommentList