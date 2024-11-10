import React, { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ReplyInputProps {
  placeholder?: string;
  initialValue?: string;
  onSubmit: (content: string) => void;
}

const ReplyInput: React.FC<ReplyInputProps> = ({
  placeholder,
  initialValue = "",
  onSubmit,
}) => {
  const [newReply, setNewReply] = useState(initialValue);
  const { currentUser } = useAuth();

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newReply.trim()) return;

    try {
      await onSubmit(newReply);
      setNewReply("");
    } catch (error) {
      console.error("답글 추가 오류:", error);
    }
  };

  return (
    <form
      onSubmit={handleAddReply}
      className="w-full flex items-center space-x-4"
    >
      <textarea
        placeholder={placeholder || "답글을 입력하세요..."}
        value={newReply}
        onChange={(e) => setNewReply(e.target.value)}
        className="flex-1 text-base p-2 border rounded resize-none"
        rows={3} // Adjust the number of rows as needed
      />
      <Button type="submit" size="icon">
        <Send className="h-4 w-4 mr-2" />
      </Button>
    </form>
  );
};

export default ReplyInput;
