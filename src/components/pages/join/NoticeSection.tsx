import type React from "react"
import { AlertCircle } from "lucide-react"

const NoticeSection: React.FC = () => (
  <div className="space-y-3 bg-muted/20 p-2 rounded-lg md:h-full md:flex md:flex-col md:justify-center">
    <h3 className="font-medium flex items-center gap-2 md:text-lg">
      <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />
      안내
    </h3>
    <ul className="space-y-2 pl-5 list-disc md:space-y-3 md:text-lg">
      <li>매글프의 글 내용은 당사자의 허락 없이 외부에 공유할 수 없어요. 안전한 장소여야 솔직한 글이 나옵니다.</li>
      <li>매 기수마다 오프라인 모임이 있어요. 참석은 자유입니다.</li>
    </ul>
  </div>
)

export default NoticeSection
