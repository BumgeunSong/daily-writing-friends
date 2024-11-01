import { useEffect, useState } from 'react'
import { firestore } from '../../../firebase'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  where,
  doc,
  getDoc,
} from 'firebase/firestore'
import { Post } from '../../../types/Posts'
import PostCard from '../post/PostCard'
import BoardHeader from './BoardHeader'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../ui/button'
import { Plus } from 'lucide-react'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const [posts, setPosts] = useState<Post[]>([])
  const [boardTitle, setBoardTitle] = useState<string>('')

  useEffect(() => {
    if (!boardId) {
      console.error('No boardId provided')
      return
    }

    const fetchBoardTitle = async () => {
      try {
        const boardDocRef = doc(firestore, 'boards', boardId)
        const boardDoc = await getDoc(boardDocRef)
        if (boardDoc.exists()) {
          const boardData = boardDoc.data()
          setBoardTitle(boardData?.title || 'Board')
        } else {
          console.error('Board not found')
        }
      } catch (error) {
        console.error('Error fetching board title:', error)
      }
    }

    fetchBoardTitle()

    const q = query(
      collection(firestore, 'posts'),
      where('boardId', '==', boardId),
      orderBy('createdAt', 'desc'),
      limit(10)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data()
        return {
          id: doc.id,
          boardId: data.boardId,
          title: data.title,
          content: data.content,
          authorId: data.authorId,
          authorName: data.authorName,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
        }
      })
      setPosts(postsData)
    })

    return () => unsubscribe()
  }, [boardId])

  return (
    <div className="min-h-screen bg-background">
      <BoardHeader title={boardTitle} />
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </main>
      <Link
        to={`/create/${boardId}`}
        className="fixed bottom-20 right-4 z-10 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label="Create Post"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </Link>
    </div>
  )
}