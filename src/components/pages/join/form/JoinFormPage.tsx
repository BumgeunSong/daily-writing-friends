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

export default function JoinFormPage() {
  const { currentUser } = useAuth()
  const { data: userNickname } = useUserNickname(currentUser?.uid)
  const { toast } = useToast()
  const { data: upcomingBoard } = useUpcomingBoard()
  const { isCurrentUserActive } = useIsCurrentUserActive()
  const [isComplete, setIsComplete] = useState(false)
  const [completeInfo, setCompleteInfo] = useState<{name: string, cohort: number} | null>(null)
  const { title, subtitle } = titleAndSubtitle(upcomingBoard, isCurrentUserActive)
  
  const handleSubmitForNewUser = async (data: JoinFormDataForNewUser) => {
    try {
      await updateUserDataByForm(currentUser?.uid, data)
      await addUserToBoardWaitingListByForm(upcomingBoard?.id, currentUser?.uid)
      setCompleteInfo({
        name: data.name,
        cohort: upcomingBoard?.cohort || 0
      })
      setIsComplete(true)
    } catch (error) {
      Sentry.captureException(error)
      toast({
        title: "오류가 발생했습니다.",
        description: "다시 시도해주세요.",
        variant: "destructive"
      })
    }
  }

  const handleSubmitForActiveUser = async (data: JoinFormDataForActiveUser) => {
    try {
      if (!upcomingBoard?.id || !currentUser?.uid) {
        throw new Error("Error adding review to board: Board ID or User ID is not provided")
      }

      await addReviewToBoard(upcomingBoard?.id, currentUser?.uid, userNickname ?? undefined, data)
      await addUserToBoardWaitingListByForm(upcomingBoard?.id, currentUser?.uid)
      setCompleteInfo({
        name: userNickname || "",
        cohort: upcomingBoard?.cohort || 0
      })
      setIsComplete(true)
    } catch (error) {
      Sentry.captureException(error)
      toast({
        title: "오류가 발생했습니다.",
        description: "다시 시도해주세요.",
        variant: "destructive"
      })
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

function titleAndSubtitle(upcomingBoard: Board | null | undefined, isCurrentUserActive: boolean | undefined) {

  const joinNotice = upcomingBoard ? `매글프 ${upcomingBoard?.cohort}기 신청하기` : "매일 글쓰기 프렌즈"
  
  let subtitle = ""
  if (isCurrentUserActive) {
    const currentCohort = upcomingBoard?.cohort ? upcomingBoard.cohort - 1 : 0
    subtitle = `매글프 ${currentCohort}기를 하셨군요! 하면서 느꼈던 점을 알려주시면 매글프에 큰 도움이 됩니다.`
  } else {
    subtitle = upcomingBoard ? `${upcomingBoard?.firstDay?.toDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 시작합니다.` : ""
  }
  return { title: joinNotice, subtitle: subtitle }
}

const addUserToBoardWaitingListByForm = async (boardId: string | undefined, userId: string | undefined) => {
  if (!boardId || !userId) {
    throw new Error("Error adding user to board waiting list: Board ID or User ID is not provided")
  }

  await addUserToBoardWaitingList(boardId, userId)
}

const updateUserDataByForm = async (uid: string | null, data: JoinFormDataForNewUser) => {
  if (!uid) {
    throw new Error("Error updating user data by form: User is not logged in")
  }

  await updateUserData(uid, {
    realName: data.name,
    phoneNumber: data.phoneNumber,
    nickname: data.nickname,
    referrer: data.referrer
  })
}