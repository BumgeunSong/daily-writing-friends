import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import FormField from "./JoinFormField"

const formSchema = z.object({
  name: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
  phoneNumber: z.string().regex(/^01[0-9]{8,9}$/, "올바른 전화번호 형식이 아닙니다."),
  nickname: z.string().optional(),
  referrer: z.string(),
})

interface JoinFormDataForNewUser {
  name: string
  phoneNumber: string
  nickname?: string
  referrer: string
}

interface JoinFormCardForNewUserProps {
  onSubmit: (data: JoinFormDataForNewUser) => void
}

export default function JoinFormCardForNewUser({ onSubmit }: JoinFormCardForNewUserProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinFormDataForNewUser>({
    resolver: zodResolver(formSchema),
  })

  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)]">
      <Card className="bg-background flex-1">
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
          </form>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="max-w-3xl lg:max-w-4xl mx-auto">
          <Button
            type="submit"
            form="join-form"
            className="w-full lg:w-64 lg:mx-auto"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "신청 중..." : "신청하기"}
          </Button>
        </div>
      </div>
    </div>
  )
}
