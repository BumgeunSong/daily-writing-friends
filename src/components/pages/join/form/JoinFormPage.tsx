import { useState } from "react"
import { JoinFormDataForActiveUser, JoinFormDataForNewUser } from "@/types/join"
import FormHeader from "./JoinFormHeader"
import JoinFormCardForNewUser from "./JoinFormCardForNewUser"
import JoinFormCardForActiveUser from "./JoinFormCardForActiveUser"
import { updateUserData, useUserNickname } from "@/utils/userUtils"
import { addUserToBoardWaitingList } from "@/utils/boardUtils"  
import { useToast } from "@/hooks/use-toast"
import * as Sentry from '@sentry/react'
import { useUpcomingBoard } from "@/hooks/useUpcomingBoard"
import JoinCompletePage from "../complete/JoinCompletePage"
import { useIsCurrentUserActive } from "@/hooks/useIsCurrentUserActive"
import { useAuth } from "@/contexts/AuthContext"
import { Board } from "@/types/Board"
import { addReviewToBoard } from "@/utils/reviewUtils"

/**
 * 에러 발생 시 토스트 메시지를 표시하는 함수
 * @param toast toast 함수
 * @param error 발생한 에러
 */
const showErrorToast = (toast: any, error: unknown) => {
  Sentry.captureException(error);
  
  let errorMessage = "알 수 없는 오류가 발생했습니다. 다시 시도해주세요.";
  
  if (error instanceof Error) {
    errorMessage = error.message;
  }
  
  toast({
    title: "신청 중 오류가 발생했습니다",
    description: errorMessage,
    variant: "destructive",
    duration: 5000, // 5초 동안 표시
  });
};

/**
 * 매글프 신청 폼 페이지 컴포넌트
 * 신규 사용자와 기존 사용자에 따라 다른 폼을 표시합니다.
 */
export default function JoinFormPage() {
  const { currentUser } = useAuth()
  const { data: userNickname } = useUserNickname(currentUser?.uid)
  const { toast } = useToast()
  const { data: upcomingBoard } = useUpcomingBoard()
  const { isCurrentUserActive } = useIsCurrentUserActive()
  const [isComplete, setIsComplete] = useState(false)
  const [completeInfo, setCompleteInfo] = useState<{name: string, cohort: number} | null>(null)
  const { title, subtitle } = titleAndSubtitle(upcomingBoard, isCurrentUserActive)
  
  /**
   * 신규 사용자 폼 제출 처리
   */
  const handleSubmitForNewUser = async (data: JoinFormDataForNewUser) => {
    try {
      // 필수 값 검증
      if (!currentUser?.uid) {
        throw new Error("사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.");
      }

      await updateUserDataByForm(currentUser.uid, data)
      
      if (upcomingBoard?.id) {
        const result = await addUserToBoardWaitingList(upcomingBoard.id, currentUser.uid);
        if (!result) {
          throw new Error("대기자 명단에 추가하는 중 오류가 발생했습니다.");
        }
      } else {
        throw new Error("신청 가능한 기수 정보를 찾을 수 없습니다.");
      }
      
      setCompleteInfo({
        name: data.name,
        cohort: upcomingBoard?.cohort ?? 0
      })
      setIsComplete(true)
      
    } catch (error) {
      showErrorToast(toast, error);
    }
  }

  /**
   * 기존 사용자 폼 제출 처리
   */
  const handleSubmitForActiveUser = async (data: JoinFormDataForActiveUser) => {
    try {
      // 필수 값 검증
      if (!upcomingBoard?.id) {
        throw new Error("신청 가능한 기수 정보를 찾을 수 없습니다.");
      }
      
      if (!currentUser?.uid) {
        throw new Error("사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.");
      }

      const result = await addReviewToBoard(upcomingBoard.id, currentUser.uid, userNickname ?? undefined, data);
      if (!result) {
        throw new Error("리뷰 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
      
      const waitlistResult = await addUserToBoardWaitingList(upcomingBoard.id, currentUser.uid);
      if (!waitlistResult) {
        throw new Error("대기자 명단에 추가하는 중 오류가 발생했습니다.");
      }
      
      setCompleteInfo({
        name: userNickname ?? "",
        cohort: upcomingBoard.cohort ?? 0
      })
      setIsComplete(true)
      
    } catch (error) {
      showErrorToast(toast, error);
    }
  }

  if (isComplete && completeInfo) {
    return <JoinCompletePage name={completeInfo.name} cohort={completeInfo.cohort} />
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 flex flex-col">
      <div className="max-w-3xl lg:max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <FormHeader title={title} subtitle={subtitle} />
        {isCurrentUserActive ? (
          <JoinFormCardForActiveUser upcomingBoard={upcomingBoard ?? null} onSubmit={handleSubmitForActiveUser} />
        ) : (
          <JoinFormCardForNewUser onSubmit={handleSubmitForNewUser} />
        )}
      </div>
    </div>
  )
}

/**
 * 상황에 맞는 제목과 부제목을 생성합니다
 * @param upcomingBoard 다가오는 보드 정보
 * @param isCurrentUserActive 현재 사용자가 활성 사용자인지 여부
 * @returns {title: string, subtitle: string} 제목과 부제목
 */
function titleAndSubtitle(upcomingBoard: Board | null | undefined, isCurrentUserActive: boolean | undefined): {title: string, subtitle: string} {
  const joinNotice = upcomingBoard ? `매글프 ${upcomingBoard.cohort}기 신청하기` : "매일 글쓰기 프렌즈"
  
  let subtitle = ""
  if (isCurrentUserActive) {
    const currentCohort = upcomingBoard?.cohort ? upcomingBoard.cohort - 1 : 0
    subtitle = `매글프 ${currentCohort}기를 하셨군요! 하면서 느꼈던 점을 알려주시면 매글프에 큰 도움이 됩니다.`
  } else {
    subtitle = upcomingBoard && upcomingBoard.firstDay 
      ? `${upcomingBoard.firstDay.toDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 시작합니다.` 
      : ""
  }
  return { title: joinNotice, subtitle }
}

/**
 * 폼 데이터로 사용자 정보를 업데이트합니다
 * @param uid 사용자 ID
 * @param data 신규 사용자 폼 데이터
 */
const updateUserDataByForm = async (uid: string, data: JoinFormDataForNewUser) => {
  await updateUserData(uid, {
    realName: data.name,
    phoneNumber: data.phoneNumber,
    nickname: data.nickname,
    referrer: data.referrer
  })
}