import React, { useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


interface ReactWithEmojiProps {
  onCreate: (emoji: string) => void;
  disabled?: boolean;
}

const ReactWithEmoji: React.FC<ReactWithEmojiProps> = ({ 
  onCreate, 
  disabled = false 
}) => {
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emoji: any) => {
    onCreate(emoji.native);
    setOpen(false);
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Smile className="mr-1 h-4 w-4" />
          <span>반응</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-full p-0 border-none shadow-lg" 
        align="start"
        side="top"
        sideOffset={5}
      >
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme="light"
          previewPosition="none"
          skinTonePosition="none"
          searchPosition="top"
          navPosition="bottom"
          perLine={8}
          maxFrequentRows={1}
        />
      </PopoverContent>
    </Popover>
  );
};

export default ReactWithEmoji; 