import React, { useEffect, useState } from "react";
import { Comment } from "../../../types/Comment";
import Replies from "../reply/Replies";
import { fetchUserNickname } from "../../../utils/userUtils";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, X } from 'lucide-react';
import CommentInput from "./CommentInput";
import { deleteCommentToPost, updateCommentToPost } from "@/utils/commentUtils";
import { convertUrlsToLinks } from "@/utils/contentUtils";
import DOMPurify from 'dompurify';

interface CommentRowProps {
  postId: string;
  comment: Comment;
  isAuthor: boolean;
}

const CommentRow: React.FC<CommentRowProps> = ({
  postId,
  comment,
  isAuthor,
}) => {
  const [userNickName, setUserNickName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleEditToggle = async () => {
    setIsEditing((prev) => !prev);
  };

  const handleDelete = async () => {
    if (window.confirm("댓글을 삭제하시겠습니까?")) {
      await deleteCommentToPost(postId, comment.id);
    }
  };

  const handleEditSubmit = async (content: string) => {
    await updateCommentToPost(postId, comment.id, content);
    setIsEditing(false);
  };

  useEffect(() => {
    fetchUserNickname(comment.userId).then(setUserNickName);
  }, [comment.userId]);

  const EditIcon = isEditing ? X : Edit;
  const sanitizedContent = DOMPurify.sanitize(convertUrlsToLinks(comment.content));
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <p className="font-semibold text-lg">{userNickName || "??"}</p>
              <span className="text-sm text-muted-foreground">
                {comment.createdAt?.toDate().toLocaleString()}
              </span>
            </div>
            {isAuthor && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  className="text-primary-500"
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="text-base mt-2 prose">
            {isEditing ? (
              <CommentInput
                onSubmit={handleEditSubmit}
                initialValue={comment.content}
              />
            ) : (
              <div 
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            )}
          </div>
        </div>
      </div>
      <Replies postId={postId} commentId={comment.id} />
    </div>
  );
};

export default CommentRow;