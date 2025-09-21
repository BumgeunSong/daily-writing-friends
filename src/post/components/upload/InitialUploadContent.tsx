import { Upload } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { UPLOAD_MESSAGES } from '../../constants/upload';

interface InitialUploadContentProps {
  onSelectFiles: () => void;
}

export function InitialUploadContent({ onSelectFiles }: InitialUploadContentProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{UPLOAD_MESSAGES.DIALOG_TITLE}</DialogTitle>
        <DialogDescription>{UPLOAD_MESSAGES.DIALOG_DESCRIPTION}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center justify-center py-6">
        <Upload className="mb-4 size-8 text-muted-foreground" />
        <Button onClick={onSelectFiles} size="lg">
          {UPLOAD_MESSAGES.DIALOG_BUTTON}
        </Button>
      </div>
    </>
  );
}