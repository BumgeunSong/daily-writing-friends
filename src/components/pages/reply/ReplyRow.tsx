import { Reply } from "@/types/Reply";
import { fetchUserNickname } from "@/utils/userUtils";
import { useEffect, useState } from "react";

interface ReplyRowProps {
  reply: Reply;
}

const ReplyRow: React.FC<ReplyRowProps>  = ({ reply }) => {

  const [userNickname, setUserNickname] = useState<string | null>(null);

  useEffect(() => {
    const loadNickname = async () => {
      fetchUserNickname(reply.userId).then(setUserNickname);
    };
    loadNickname();
  }, [reply.userId]);

  return (
    <div key={reply.id} className="flex items-start space-x-4 mt-2">
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <p className="font-semibold">{userNickname}</p>
          <span className="text-xs text-muted-foreground">
            {reply.createdAt?.toDate().toLocaleString()}
          </span>
        </div>
        <p className="text-sm mt-1">{reply.content}</p>
      </div>
    </div>
  )
}

export default ReplyRow;