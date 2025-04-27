import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import UserPostsTab from './UserPostsTab';
import UserCommentsRepliesTab from './UserCommentsRepliesTab';

interface UserActivityTabProps {
  userId: string;
}

export default function UserActivityTab({ userId }: UserActivityTabProps) {
  return (
    <div className="mt-4">
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">글</TabsTrigger>
          <TabsTrigger value="comments">댓글</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-4">
          <UserPostsTab userId={userId} />
        </TabsContent>
        <TabsContent value="comments" className="mt-4">
          <UserCommentsRepliesTab userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 