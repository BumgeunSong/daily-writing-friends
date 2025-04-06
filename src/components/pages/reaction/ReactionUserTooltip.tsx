import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionUser } from "@/types/Reaction";

// 툴팁 내용을 위한 별도 컴포넌트
interface ReactionUsersTooltipProps {
    users: ReactionUser[];
  }
  
export const ReactionUsersTooltip: React.FC<ReactionUsersTooltipProps> = ({ users }) => {
    return (
      <div className="flex flex-col gap-2 p-2 max-h-60 overflow-y-auto">
        {users.map(user => (
          <div key={user.userId} className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.userProfileImage} alt={user.userName} />
              <AvatarFallback>{user.userName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{user.userName}</span>
          </div>
        ))}
      </div>
    );
  };