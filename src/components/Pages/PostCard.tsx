import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Post } from '@/types/Posts'
import { useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import DOMPurify from 'dompurify';
interface PostCardProps {
    post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/post/${post.id}`)
    }

    const sanitizedContent = DOMPurify.sanitize(post.content);

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
            <CardContent
                onClick={handleCardClick}
                className="cursor-pointer hover:bg-muted transition-colors duration-200"
            >
                <div className="line-clamp-3" dangerouslySetInnerHTML={{ __html: sanitizedContent }}>
                </div>
            </CardContent>
        </Card>
    )
}

export default PostCard;