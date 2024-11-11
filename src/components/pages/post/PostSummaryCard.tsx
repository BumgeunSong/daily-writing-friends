import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Post } from '@/types/Posts'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { User as Author } from '@/types/User'
import DOMPurify from 'dompurify';
import { fetchUserData, listenForUserDataChanges } from '@/utils/userUtils'
import { useEffect, useState } from 'react'

interface PostSummaryCardProps {
    post: Post;
    onClick: () => void;
}

const PostSummaryCard: React.FC<PostSummaryCardProps> = ({ post, onClick }) => {
    const sanitizedContent = DOMPurify.sanitize(post.content);
    const [authorData, setAuthorData] = useState<Author | null>(null)

    useEffect(() => {
        const fetchAuthorData = async () => {
            try {
                const authorData = await fetchUserData(post.authorId);
                setAuthorData(authorData);

                // Set up real-time listener for author data changes
                const unsubscribe = listenForUserDataChanges(post.authorId, (newData) => {
                    setAuthorData(newData);
                });

                // Clean up the listener on component unmount
                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching author data:', error);
            }
        };

        fetchAuthorData();
    }, [post.authorId]);

    return (
        <Card className="mb-4">
            <CardHeader>
                <h2 className="text-2xl font-bold">{post.title}</h2>
                <div className="flex items-center mt-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage
                            src={authorData?.profilePhotoURL || ''}
                            alt={authorData?.realName || 'User'}
                        />
                        <AvatarFallback>
                            <User className="h-4 w-4" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="ml-2">
                        <p className="text-sm font-medium">{authorData?.nickname}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                        </p>
                    </div>
                </div>
            </CardHeader>
            <Link to={`/board/${post.boardId}/post/${post.id}`} onClick={onClick}>
                <CardContent
                    className="cursor-pointer hover:bg-muted transition-colors duration-200 p-6"
                >
                    <div className="line-clamp-5" dangerouslySetInnerHTML={{ __html: sanitizedContent }}>
                    </div>
                </CardContent>
            </Link>
        </Card>
    )
}

export default PostSummaryCard;