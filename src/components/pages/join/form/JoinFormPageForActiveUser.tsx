import { useState } from "react"
import { showErrorToast } from "@/components/common/showErrorToast"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useUpcomingBoard } from "@/hooks/useUpcomingBoard"
import { Board } from "@/types/Board"
import { JoinFormDataForActiveUser } from "@/types/join"
import { addUserToBoardWaitingList } from "@/utils/boardUtils"  
import { addReviewToBoard } from "@/utils/reviewUtils"
import { useUserNickname } from "@/utils/userUtils"
import JoinFormCardForActiveUser from "./JoinFormCardForActiveUser"
import FormHeader from "./JoinFormHeader"
import JoinCompletePage from "../complete/JoinCompletePage"

/**
 * 기존 사용자를 위한 매글프 신청 폼 페이지 컴포넌트
 */
export default function JoinFormPageForActiveUser() {
    const { currentUser } = useAuth()
    const { data: userNickname } = useUserNickname(currentUser?.uid)
    const { toast } = useToast()
    const { data: upcomingBoard } = useUpcomingBoard()
    const [isComplete, setIsComplete] = useState(false)
    const [completeInfo, setCompleteInfo] = useState<{name: string, cohort: number} | null>(null)
    const { title, subtitle } = titleAndSubtitle(upcomingBoard)
    
    /**
     * 폼 제출 핸들러
     */
    const handleSubmit = async (data: JoinFormDataForActiveUser) => {
      if (!upcomingBoard?.id || !currentUser?.uid) {
        showErrorToast(toast, new Error("필수 정보가 누락되었습니다."));
        return;
      }
      
      const result = await submitActiveUserReview({
        data,
        upcomingBoard: upcomingBoard,
        userId: currentUser.uid,
        nickname: userNickname ?? undefined
      });
      
      if (result.success) {
        setCompleteInfo({
          name: result.name,
          cohort: result.cohort
        });
        setIsComplete(true);
      } else {
        showErrorToast(toast, result.error);
      }
    }
  
    if (isComplete && completeInfo) {
      return <JoinCompletePage name={completeInfo.name} cohort={completeInfo.cohort} />
    }
    
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-slate-50">
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:max-w-4xl">
          <FormHeader title={title} subtitle={subtitle} />
          <JoinFormCardForActiveUser upcomingBoard={upcomingBoard ?? null} onSubmit={handleSubmit} />
        </div>
      </div>
    )
  }

/**
 * 기존 사용자의 리뷰 제출 처리를 위한 순수 함수
 * @param params 요청 파라미터
 * @returns 성공 시 사용자 정보, 실패 시 에러 객체
 */
export async function submitActiveUserReview(params: {
  data: JoinFormDataForActiveUser; 
  upcomingBoard: Board; 
  userId: string; 
  nickname?: string;
}): Promise<{ success: true; name: string; cohort: number } | { success: false; error: Error }> {
  const { data, upcomingBoard, userId, nickname } = params;
  
  try {
    // 필수 값 검증
    if (!upcomingBoard.id) {
      throw new Error("신청 가능한 기수 정보를 찾을 수 없습니다.");
    }
    
    if (!userId) {
      throw new Error("사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.");
    }

    // 리뷰 등록
    const result = await addReviewToBoard(upcomingBoard.id, userId, nickname, data);
    if (!result) {
      throw new Error("리뷰 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
    
    // 대기자 명단에 추가
    const waitlistResult = await addUserToBoardWaitingList(upcomingBoard.id, userId);
    if (!waitlistResult) {
      throw new Error("대기자 명단에 추가하는 중 오류가 발생했습니다.");
    }
    
    // 성공 정보 반환
    return {
      success: true,
      name: nickname ?? "",
      cohort: upcomingBoard.cohort ?? 0
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("알 수 없는 오류가 발생했습니다.")
    };
  }
}

/**
 * 상황에 맞는 제목과 부제목을 생성합니다
 * @param upcomingBoard 다가오는 보드 정보
 * @returns {title: string, subtitle: string} 제목과 부제목
 */
function titleAndSubtitle(upcomingBoard: Board | null | undefined): {title: string, subtitle: string} {
  const title = upcomingBoard ? `매글프 ${upcomingBoard.cohort}기 신청하기` : "매일 글쓰기 프렌즈"
  
  const currentCohort = upcomingBoard?.cohort ? upcomingBoard.cohort - 1 : 0
  const subtitle = `매글프 ${currentCohort}기를 하셨군요! 하면서 느꼈던 점을 알려주시면 매글프에 큰 도움이 됩니다.`
  
  return { title, subtitle }
}