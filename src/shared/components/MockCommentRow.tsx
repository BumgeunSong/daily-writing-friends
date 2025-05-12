import { Timestamp } from "firebase/firestore"
import { MessageCircle } from "lucide-react"
import { sanitizeCommentContent } from "@/post/utils/contentUtils"
import { AvatarFallback, AvatarImage, Avatar } from '@shared/ui/avatar'
import { Button } from '@shared/ui/button'
import { Card, CardContent } from '@shared/ui/card'
import { Comment } from "@/types/Comment"

export const mockComment: Comment = {
  id: "mock-comment-1",
  userId: "mock-user-1",
  content: "그냥 지나칠 수도 있는 일을 보고 이런 질문까지 떠올리시다니, 멋진데요?",
  createdAt: Timestamp.fromDate(new Date("2024-03-14T10:21:00")),
  userName: "김프렌즈",
  userProfileImage: "https://github.com/shadcn.png"
}

export const mockUserProfile = {
  id: "mock-user-1",
  nickname: "댓글 프렌즈",
  realname: "김프렌즈",
  profilePhotoURL: "https://github.com/shadcn.png",
  bio: "매일 글쓰기를 실천하는 프렌즈"
} 

export default function MockCommentRow() {
    return (
        <Card className="m-4 rounded-lg bg-white">
            <CardContent>
                <div className="mt-4 w-full space-y-2">
                    <div className="flex items-center space-x-4">
                        <Avatar className="size-6">
                            <AvatarImage
                                src={mockUserProfile.profilePhotoURL || undefined}
                                alt={mockUserProfile.nickname || "User"}
                                className="rounded-full object-cover"
                            />
                            <AvatarFallback className="text-sm">{mockUserProfile.nickname?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <p className="text-base font-semibold leading-none">{mockUserProfile.nickname || "??"}</p>
                            <span className="text-sm text-muted-foreground">{mockComment.createdAt?.toDate().toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="text-base text-gray-700">
                        <div
                            className="prose whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: sanitizeCommentContent(mockComment.content) }}
                        />
                    </div>
                </div>
                <div className="mt-2 flex items-center space-x-2">
                    <MessageCircle className="size-4 text-muted-foreground" />
                    <div className="flex items-center space-x-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-0 text-sm font-normal text-muted-foreground hover:text-foreground"
                        >
                            답글 2개
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
