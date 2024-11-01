import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { firestore } from '../../../firebase'
import { deleteDoc, doc, collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { fetchPost } from '../../../utils/postUtils'
import { Post } from '../../../types/Posts'
import { Comment } from '../../../types/Comment'
import { useAuth } from '../../../contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Edit, Trash2, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import addCommentToPost from '@/utils/commentUtils'

const deletePost = async (id: string): Promise<void> => {
  await deleteDoc(doc(firestore, 'posts', id))
}

const handleDelete = async (id: string, boardId: string, navigate: (path: string) => void): Promise<void> => {
  if (!id) return

  const confirmDelete = window.confirm('정말로 이 게시물을 삭제하시겠습니까?')
  if (!confirmDelete) return

  try {
    await deletePost(id)
    navigate(`/board/${boardId}`)
  } catch (error) {
    console.error('게시물 삭제 오류:', error)
  }
}

export default function PostDetailPage() {
  const { id, boardId } = useParams<{ id: string, boardId: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        console.error('게시물 ID가 제공되지 않았습니다')
        setIsLoading(false)
        return
      }

      try {
        const fetchedPost = await fetchPost(id)
        setPost(fetchedPost)

        // Set up real-time listener for comments subcollection
        const postRef = doc(firestore, 'posts', id)
        const commentsQuery = query(
          collection(postRef, 'comments'),
          orderBy('createdAt', 'desc')
        )

        const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
          const fetchedComments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Comment[]
          setComments(fetchedComments)
        })

        return () => unsubscribe()
      } catch (error) {
        console.error('게시물 가져오기 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPost()
  }, [id])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !id || !newComment.trim()) return

    try {
      await addCommentToPost(id, newComment, currentUser.uid, currentUser.displayName, currentUser.photoURL)
      setNewComment('')
    } catch (error) {
      console.error('댓글 추가 오류:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">게시물을 찾을 수 없습니다.</h1>
        <Link to={`/board/${boardId}`}>
          <Button>
            <ChevronLeft className="mr-2 h-4 w-4" /> 피드로 돌아가기
          </Button>
        </Link>
      </div>
    )
  }

  const isAuthor = currentUser?.uid === post.authorId

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to={`/board/${boardId}`}>
        <Button variant="ghost" className="mb-6">
          <ChevronLeft className="mr-2 h-4 w-4" /> 피드로 돌아가기
        </Button>
      </Link>
      <Card>
        <CardHeader className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              작성자: {post.authorName} | 작성일: {post.createdAt.toLocaleString()}
            </p>
            {isAuthor && (
              <div className="flex space-x-2">
                <Link to={`/board/${boardId}/edit/${id}`}>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(id!, boardId!, (path) => navigate(path))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div
            dangerouslySetInnerHTML={{ __html: post.content }}
            className="prose prose-sm sm:prose lg:prose-lg mx-auto"
          />
        </CardContent>
      </Card>

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
                </div>
                <p className="text-sm mt-1">{comment.content}</p>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
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
    </div>
  )
}