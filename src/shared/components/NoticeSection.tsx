import { AlertCircle } from "lucide-react"
import type React from "react"

const NoticeSection: React.FC = () => (
  <div className="space-y-3 rounded-lg bg-muted/20 p-2 md:flex md:h-full md:flex-col md:justify-center">
    <h3 className="flex items-center gap-2 font-medium md:text-lg">
      <AlertCircle className="size-4 md:size-5" />
      안내
    </h3>
    <ul className="list-disc space-y-2 pl-5 md:space-y-3 md:text-lg">
      <li>매글프의 글 내용은 당사자의 허락 없이 외부에 공유할 수 없어요. 안전한 장소여야 솔직한 글이 나옵니다.</li>
      <li>매 기수마다 오프라인 모임이 있어요. 참석은 자유입니다.</li>
    </ul>
  </div>
)

export default NoticeSection
