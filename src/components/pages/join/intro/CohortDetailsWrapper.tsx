import { Board } from "@/types/Board"
import CohortDetailsCard from "./CohortDetailsCard"
import NoticeSection from "./NoticeSection"

interface CohortDetailsWrapperProps {
  upcomingBoard?: Board | null
}

export default function CohortDetailsWrapper({ upcomingBoard }: CohortDetailsWrapperProps) {
  return (
    <div className="px-4 md:px-4">
      <div className="space-y-8 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
        <CohortDetailsCard upcomingBoard={upcomingBoard}/>
        <NoticeSection />
      </div>
    </div>
  )
} 