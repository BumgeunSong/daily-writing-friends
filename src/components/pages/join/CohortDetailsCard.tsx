import React from 'react';
import { CalendarDays, Clock, PenLine, AlignLeft, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

const CohortDetailsCard: React.FC = () => (
  <Card className="p-6 space-y-4 bg-muted/30 relative">
    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
      <div className="flex items-center gap-1 bg-black text-white px-3 py-1 rounded-full shadow-md">
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">곧 시작해요</span>
      </div>
    </div>

    <div className="mt-4 mb-2">
      <h3 className="text-lg font-bold">매일 글쓰기 프렌즈 N기</h3>
    </div>

    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <p>2025년 5월 1일 - 2025년 5월 28일</p>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <p>4주간</p>
      </div>

      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-muted-foreground" />
        <p>총 20개의 글</p>
      </div>

      <div className="flex items-center gap-2">
        <AlignLeft className="h-5 w-5 text-muted-foreground" />
        <p>최소 분량 3줄</p>
      </div>
    </div>
  </Card>
);

export default CohortDetailsCard; 