import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import FormField from "./JoinFormField"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

const formSchema = z.object({
  positiveExperience: z.string().optional(),
  negativeExperience: z.string().optional(),
  suggestions: z.string().optional(),
  recommendationScore: z.number().min(1).max(10),
  willContinue: z.enum(["yes", "no"]),
})

interface JoinFormDataForActiveUser {
  positiveExperience?: string
  negativeExperience?: string
  suggestions?: string
  recommendationScore: number
  willContinue: "yes" | "no"
}

interface JoinFormCardForActiveUserProps {
  onSubmit: (data: JoinFormDataForActiveUser) => void
}

export default function JoinFormCardForActiveUser({ 
  onSubmit
}: JoinFormCardForActiveUserProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<JoinFormDataForActiveUser>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recommendationScore: 5,
      willContinue: "yes"
    }
  })

  const recommendationScore = watch("recommendationScore")

  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)]">
      <Card className="bg-background flex-1">
        <CardContent className="p-8">
          <form id="join-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">매일 글쓰기 프렌즈를 하면서 마음에 들었던 점은 무엇인가요? <span className="text-muted-foreground text-sm">(선택)</span></h3>
              <FormField
                id="positiveExperience"
                label=""
                type="textarea"
                inputMode="text"
                placeholder="마음에 들었던 점을 자세히 입력해주세요"
                register={register}
                error={errors.positiveExperience}
                optional
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">매일 글쓰기 프렌즈를 하면서 어려웠던 점, 아쉬운 점은 무엇인가요? <span className="text-muted-foreground text-sm">(선택)</span></h3>
              <FormField
                id="negativeExperience"
                label=""
                type="textarea"
                inputMode="text"
                placeholder="어려웠던 점과 아쉬운 점을 자세히 입력해주세요"
                register={register}
                error={errors.negativeExperience}
                optional
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">매일 글쓰기 프렌즈 이렇게 하면 좋겠다! 하는 아이디어가 있으신가요? <span className="text-muted-foreground text-sm">(선택)</span></h3>
              <FormField
                id="suggestions"
                label=""
                type="textarea"
                inputMode="text"
                placeholder="개선 아이디어를 자세히 입력해주세요"
                register={register}
                error={errors.suggestions}
                optional
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">주변에 글쓰기에 관심이 있는 사람이 있다면, 매글프를 얼마나 추천하고 싶으신가요?</h3>
              <div className="px-4">
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[recommendationScore]}
                  onValueChange={(value: number[]) => setValue("recommendationScore", value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>1 - 전혀 추천하고 싶지 않다</span>
                  <span>10 - 매우 추천하고 싶다</span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-lg font-semibold">{recommendationScore}점</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">다음 기수도 계속하실 건가요?</h3>
              <RadioGroup
                defaultValue="yes"
                onValueChange={(value: "yes" | "no") => setValue("willContinue", value)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes">네, 계속 할래요</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no">아니오, 다음 기회에...</Label>
                </div>
              </RadioGroup>
            </div>
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
            {isSubmitting ? "제출 중..." : "제출하기"}
          </Button>
        </div>
      </div>
    </div>
  )
} 