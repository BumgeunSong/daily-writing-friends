import { useState } from "react"
import { toast } from "sonner"
import type { Board } from "@/board/model/Board"
import { showErrorToast } from "@/login/components/showErrorToast"
import { useIsUserInWaitingList } from "@/login/hooks/useIsUserInWaitingList"
import { useUpcomingBoard } from "@/login/hooks/useUpcomingBoard"
import type { JoinFormDataForActiveUser } from "@/login/model/join"
import { useAuth } from '@/shared/hooks/useAuth'
import { addUserToBoardWaitingList } from "@/board/utils/boardUtils"
import { addReviewToBoard } from "@/shared/utils/reviewUtils"
import { useUserNickname } from "@/user/hooks/useUserNickname"
import JoinCompletePage from "./JoinCompletePage"
import JoinFormCardForActiveUser from "./JoinFormCardForActiveUser"
import FormHeader from "./JoinFormHeader"

/**
 * 기존 사용자를 위한 매글프 신청 폼 페이지 컴포넌트
 */
export default function JoinFormPageForActiveUser() {
    const { currentUser } = useAuth()
    const { nickname: userNickname, isLoading: isNicknameLoading } = useUserNickname(currentUser?.uid ?? null)
    const { data: upcomingBoard, isLoading: isBoardLoading } = useUpcomingBoard()
    const { isInWaitingList, isLoading: isCheckingWaitingList } = useIsUserInWaitingList()
    const [isComplete, setIsComplete] = useState(false)
    const [completeInfo, setCompleteInfo] = useState<{name: string, cohort: number} | null>(null)
    const { title, subtitle } = titleAndSubtitle(upcomingBoard)

    /**
     * 폼 제출 핸들러
     */
    const handleSubmit = async (data: JoinFormDataForActiveUser) => {
      if (!currentUser?.uid) {
        showErrorToast(toast, new Error("로그인 상태가 만료되었습니다. 다시 로그인해주세요."));
        return;
      }
      if (!upcomingBoard?.id) {
        showErrorToast(toast, new Error("신청 가능한 기수 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요."));
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

    const isLoading = isBoardLoading || isCheckingWaitingList || (isInWaitingList && isNicknameLoading);

    if (isLoading) {
      return null;
    }

    if (!upcomingBoard) {
      return (
        <div className="flex min-h-screen flex-col bg-background">
          <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:max-w-4xl">
            <FormHeader title="매일 글쓰기 프렌즈" subtitle="현재 신청 가능한 기수 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요." />
          </div>
        </div>
      );
    }

    const shouldShowCompletePage = (isComplete && completeInfo) || isInWaitingList;

    if (shouldShowCompletePage) {
      const userNameForCompletePage = completeInfo?.name || userNickname || "";
      const cohortForCompletePage = completeInfo?.cohort || upcomingBoard?.cohort || 0;
      return <JoinCompletePage name={userNameForCompletePage} cohort={cohortForCompletePage} />
    }

    return (
      <div className="flex min-h-screen flex-col bg-background">
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