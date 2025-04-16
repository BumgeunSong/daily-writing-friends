import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import FormField from "./JoinFormField"

const formSchema = z.object({
  nickname: z.string().min(2, "필명은 2글자 이상이어야 합니다."),
  motivation: z.string().min(10, "참여 동기를 10글자 이상 입력해주세요."),
  goal: z.string().min(10, "목표를 10글자 이상 입력해주세요."),
})

interface JoinFormDataForActiveUser {
  nickname: string
  motivation: string
  goal: string
}

interface JoinFormCardForActiveUserProps {
  onSubmit: (data: JoinFormDataForActiveUser) => void
  defaultNickname?: string
}

export default function JoinFormCardForActiveUser({ 
  onSubmit,
  defaultNickname = ""
}: JoinFormCardForActiveUserProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinFormDataForActiveUser>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nickname: defaultNickname
    }
  })

  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)]">
      <Card className="bg-background flex-1">
        <CardContent className="p-8">
          <form id="join-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              id="nickname"
              label="필명"
              type="text"
              inputMode="text"
              placeholder="매글프에서 사용할 이름을 입력해주세요"
              register={register}
              error={errors.nickname}
            />

            <FormField
              id="motivation"
              label="참여 동기"
              type="textarea"
              inputMode="text"
              placeholder="매글프에 참여하고 싶은 이유를 입력해주세요"
              register={register}
              error={errors.motivation}
            />

            <FormField
              id="goal"
              label="목표"
              type="textarea"
              inputMode="text"
              placeholder="매글프에서 이루고 싶은 목표를 입력해주세요"
              register={register}
              error={errors.goal}
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