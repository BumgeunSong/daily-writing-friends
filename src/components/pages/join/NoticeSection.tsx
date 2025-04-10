import React from 'react';
import { AlertCircle } from "lucide-react";

const NoticeSection: React.FC = () => (
  <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
    <h3 className="font-medium flex items-center gap-2">
      <AlertCircle className="h-4 w-4" />
      안내
    </h3>
    <ul className="space-y-2 pl-5 list-disc">
      <li>매글프의 글 내용은 당사자의 허락 없이 외부에 공유할 수 없어요.</li>
      <li>매 기수마다 오프라인 모임이 있어요.</li>
    </ul>
  </div>
);

export default NoticeSection; 