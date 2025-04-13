import type { JoinFormData } from "@/types/join"
import FormHeader from "./JoinFormHeader"
import JoinFormCard from "./JoinFormCard"

export default function JoinFormPage() {
  const handleSubmit = (data: JoinFormData) => {
    console.log(data)
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
