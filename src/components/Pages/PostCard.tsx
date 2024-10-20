import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, ChevronUp, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Post } from '@/types/Posts'

interface PostCardProps {
    post: Post;
}
  
const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="mb-4">
      <CardHeader>
        <h2 className="text-2xl font-bold">{post.title}</h2>
        <div className="flex items-center mt-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="ml-2">
            <p className="text-sm font-medium">{post.authorName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={expanded ? '' : 'line-clamp-3'}>
          <ReactMarkdown className="prose dark:prose-invert">{post.content}</ReactMarkdown>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              Show Less <ChevronUp className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Show More <ChevronDown className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default PostCard;