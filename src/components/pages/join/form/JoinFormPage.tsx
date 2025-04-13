import type { JoinFormData } from "@/types/join"
import FormHeader from "./JoinFormHeader"
import JoinFormCard from "./JoinFormCard"
import { useAuth } from "@/contexts/AuthContext"
import { updateUserData } from "@/utils/userUtils"
import { addUserToBoardWaitingList } from "@/utils/boardUtils"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import * as Sentry from '@sentry/react'
import { useUpcomingBoard } from "@/hooks/useUpcomingBoard"

export default function JoinFormPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: upcomingBoard } = useUpcomingBoard()

  const handleSubmit = async (data: JoinFormData) => {
    try {
      updateUserDataByForm(currentUser?.uid, data)
      addUserToBoardWaitingListByForm(upcomingBoard?.id, currentUser?.uid)
      navigate(`/join/complete?name=${data.name}&cohort=${upcomingBoard?.cohort}`)
    } catch (error) {
      Sentry.captureException(error)
      toast({
        title: "오류가 발생했습니다.",
        description: "다시 시도해주세요.",
        variant: "destructive"
      })
    }
  }

  const joinNotice = upcomingBoard ? `매글프 ${upcomingBoard?.cohort}기 신청하기` : "매일 글쓰기 프렌즈"
  const firstDayNotice = upcomingBoard ? `${upcomingBoard?.firstDay?.toDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 시작합니다.` : ""
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 flex flex-col">
      <div className="max-w-3xl lg:max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <FormHeader title={joinNotice} subtitle={firstDayNotice} />
        <JoinFormCard onSubmit={handleSubmit} />
      </div>
    </div>
  )
}

const addUserToBoardWaitingListByForm = async (boardId: string | undefined, userId: string | undefined) => {
  if (!boardId || !userId) {
    throw new Error("Error adding user to board waiting list: Board ID or User ID is not provided")
  }

  await addUserToBoardWaitingList(boardId, userId)
}

const updateUserDataByForm = async (uid: string | null, data: JoinFormData) => {
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