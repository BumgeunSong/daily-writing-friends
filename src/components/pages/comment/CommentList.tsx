import React, { useEffect, useState } from 'react'
import { Comment } from '../../../types/Comment'
import { onSnapshot, orderBy, query, collection } from 'firebase/firestore'
import { firestore } from '@/firebase'
import CommentRow from './CommentRow'

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
                <CommentRow key={comment.id} postId={postId} comment={comment} />
            ))}
        </div>
    )
}

export default CommentList