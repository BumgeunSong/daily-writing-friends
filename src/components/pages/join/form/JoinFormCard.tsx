import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import FormField from "./JoinFormField"
import { JoinFormData } from "@/types/join"

const formSchema = z.object({
  name: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
  phoneNumber: z.string().regex(/^01[0-9]{8,9}$/, "올바른 전화번호 형식이 아닙니다."),
  nickname: z.string().optional(),
  referrer: z.string(),
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
    <Card className="bg-background">
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
            id="nickname"
            label="필명"
            type="text"
            inputMode="text"
            placeholder="매글프에서 사용할 이름을 입력해주세요"
            register={register}
            error={errors.nickname}
            optional
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

          <Button
            type="submit"
            className="w-full lg:w-64 lg:mx-auto"
            size="lg"
          >
            신청하기
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
