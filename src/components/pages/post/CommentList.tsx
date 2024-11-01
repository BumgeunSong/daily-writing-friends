import React, { useEffect, useState } from 'react'
import { Comment } from '../../../types/Comment'
import { onSnapshot, orderBy, query, collection } from 'firebase/firestore'
import { firestore } from '@/firebase'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Replies from './Replies'

interface CommentListProps {
    postId: string
}

const CommentList: React.FC<CommentListProps> = ({ postId }) => {
    const [comments, setComments] = useState<Comment[]>([])

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

    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <div key={comment.id} className="flex flex-col space-y-2">
                    <div className="flex items-start space-x-4">
                        <div className="flex-1">
                            <div className="flex items-center space-x-2">
                                <p className="font-semibold">{comment.userName}</p>
                                <span className="text-xs text-muted-foreground">
                                    {comment.createdAt?.toDate().toLocaleString()}
                                </span>
                            </div>
                            <p className="text-sm mt-2">{comment.content}</p>
                            <Replies postId={postId} commentId={comment.id} />
                        </div>
                    </div>
                    
                </div>
            ))}
        </div>
    )
}

export default CommentList