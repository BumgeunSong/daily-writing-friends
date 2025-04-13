import type { JoinFormData } from "@/types/join"
import FormHeader from "./JoinFormHeader"
import JoinFormCard from "./JoinFormCard"
import { useAuth } from "@/contexts/AuthContext"
import { updateUserData } from "@/utils/userUtils"

export default function JoinFormPage() {
  const { currentUser } = useAuth()
  
  const handleSubmit = async (data: JoinFormData) => {
    updateUserDataByForm(currentUser?.uid, data)
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
    console.error("Error updating user data by form: User is not logged in")
    return
  }

  try {
    await updateUserData(uid, {
      realName: data.name,
      phoneNumber: data.phoneNumber,
      nickname: data.nickname,
      referrer: data.referrer
    })

  } catch (error) {
    console.error("Error updating user data by form:", error)
  }
}