import { useEffect, useState } from 'react'
import { firestore } from '../../../firebase'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  where,
  doc,
  getDoc,
} from 'firebase/firestore'
import { Post } from '../../../types/Posts'
import PostSummaryCard from '../post/PostSummaryCard'
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

    fetchBoardTitle(boardId, setBoardTitle)
    const unsubscribe = fetchPosts(boardId, setPosts)
    restoreScrollPosition(boardId)

    return unsubscribe
  }, [boardId])

  const handlePostClick = () => {
    if (!boardId) {
      console.error('No boardId provided')
      return
    }
    saveScrollPosition(boardId)
  }

  return (
    <div className="min-h-screen bg-background">
      <BoardHeader title={boardTitle} />
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="space-y-6">
          {posts.map((post) => (
            <PostSummaryCard key={post.id} post={post} onClick={handlePostClick} />
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

function fetchBoardTitle(boardId: string, setBoardTitle: React.Dispatch<React.SetStateAction<string>>) {
  const fetchTitle = async () => {
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
  fetchTitle()
}

function fetchPosts(boardId: string, setPosts: React.Dispatch<React.SetStateAction<Post[]>>) {
  const q = query(
    collection(firestore, 'posts'),
    where('boardId', '==', boardId),
    orderBy('createdAt', 'desc')
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

  return unsubscribe
}

function restoreScrollPosition(boardId: string) {
  const savedScrollPosition = sessionStorage.getItem(`scrollPosition-${boardId}`)
  if (savedScrollPosition) {
    setTimeout(() => {
      window.scrollTo({
        top: parseInt(savedScrollPosition, 10),
        left: 0
      });
    }, 300)
  }
}

function saveScrollPosition(boardId: string) {
  console.log("Save scroll position", window.scrollY)
  sessionStorage.setItem(`scrollPosition-${boardId}`, window.scrollY.toString())
}