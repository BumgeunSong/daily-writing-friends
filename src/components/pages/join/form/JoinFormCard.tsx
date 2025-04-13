import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import type { JoinFormData } from "@/types/join"
import FormField from "./JoinFormField"

const formSchema = z.object({
  name: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
  phoneNumber: z.string().regex(/^01[0-9]{8,9}$/, "올바른 전화번호 형식이 아닙니다."),
  referrer: z.string().optional(),
})

interface JoinFormCardProps {
  onSubmit: (data: JoinFormData) => void
}

export default function JoinFormCard({ onSubmit }: JoinFormCardProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinFormData>({
    resolver: zodResolver(formSchema),
  })

  return (
    <Card className="shadow-lg border-slate-200 overflow-hidden mb-8">
      <CardContent className="p-8">
        <form id="join-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            id="name"
            label="이름"
            type="text"
            inputMode="text"
            placeholder="이름을 입력해주세요"
            register={register}
            error={errors.name}
          />

          <FormField
            id="phoneNumber"
            label="전화번호"
            type="tel"
            inputMode="numeric"
            placeholder="ex. 01043219876"
            register={register}
            error={errors.phoneNumber}
          />

          <FormField
            id="referrer"
            label="추천인"
            type="text"
            inputMode="text"
            placeholder="매글프를 소개해준 지인 이름을 입력해주세요"
            register={register}
            error={errors.referrer}
          />
        </form>
      </CardContent>
      <CardFooter className="px-8 py-6 bg-slate-50 border-t border-slate-100">
        <Button
          type="submit"
          form="join-form"
          className="w-full lg:w-64 h-14 text-base font-medium flex items-center justify-center gap-2 rounded-md transition-all hover:translate-y-[-2px]"
          size="lg"
        >
          신청하기 <ArrowRight className="h-5 w-5 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  )
}
