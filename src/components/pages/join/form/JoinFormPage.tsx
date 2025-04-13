import type { JoinFormData } from "@/types/join"
import FormHeader from "./JoinFormHeader"
import JoinFormCard from "./JoinFormCard"
import { useAuth } from "@/contexts/AuthContext"
import { updateUserData } from "@/utils/userUtils"
import { useRemoteConfig } from "@/hooks/useRemoteConfig"
import { addUserToBoardWaitingList } from "@/utils/boardUtils"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import * as Sentry from '@sentry/react'

const DEFAULT_BOARD_ID: string = ''

export default function JoinFormPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { value: upcomingBoardId } = useRemoteConfig('upcoming_board_id', DEFAULT_BOARD_ID)

  const handleSubmit = async (data: JoinFormData) => {
    try {
      updateUserDataByForm(currentUser?.uid, data)
      addUserToBoardWaitingList(upcomingBoardId, currentUser?.uid)
      toast({
        title: "신청이 완료되었습니다.",
        variant: "default"
      })
      navigate('/')
    } catch (error) {
      Sentry.captureException(error)
      toast({
        title: "오류가 발생했습니다.",
        description: "다시 시도해주세요.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 flex flex-col">
      <div className="max-w-3xl lg:max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        <FormHeader title="신청하기" subtitle="매일 글쓰기 프렌즈 N기" />
        <JoinFormCard onSubmit={handleSubmit} />
      </div>
    </div>
  )
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
