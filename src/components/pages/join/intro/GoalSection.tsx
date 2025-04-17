import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { UserStatsCard } from "@/components/pages/stats/UserStatsCard"
import { mockUserStats } from "./mockUserStats"
import MockCommentRow from "./MockCommentRow"

export default function GoalSection() {
  return (
    <div className="space-y-8">
      {/* 첫 번째 목표 섹션 */}
      <Card className="bg-muted/10 border-none">
        <CardHeader>
          <CardTitle className="text-xl font-bold">매일 쓰기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            건강해지려면 일단 헬스장에 꾸준히 가야하잖아요?
          </p>
          <p className="text-muted-foreground">
            글도 마찬가지입니다. 일단 꾸준히 써야 잘 써지고 생각이 깊어집니다.
          </p>
          <p className="text-muted-foreground">
            우리는 주 5회 꾸준히 쓰는 습관을 만듭니다.
          </p>
          <p className="text-muted-foreground">
            내용과 형식은 자유이며 완성된 글이 아니어도 괜찮습니다.
          </p>
          <p className="text-muted-foreground font-medium">
            딱 3줄만 쓰셔도 됩니다. 핵심은 매일 쓰는 습관을 만드는 것!
          </p>
        </CardContent>
        <CardFooter>
          <UserStatsCard stats={mockUserStats} />
        </CardFooter>
      </Card>

      {/* 두 번째 목표 섹션 */}
      <Card className="bg-muted/10 border-none">
        <CardHeader>
          <CardTitle className="text-xl font-bold">같이 쓰기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            혼자서만 글을 쓰면 머릿속이 잘 정리되지 않습니다.
          </p>
          <p className="text-muted-foreground">
            그렇다고 너무 공개적이면 솔직하게 쓰기 어렵죠.
          </p>
          <p className="text-muted-foreground">
            매글프는 비공개 소그룹에서 다같이 매일 글을 씁니다.
          </p>
          <p className="text-muted-foreground font-medium">
            다른 프렌즈와 약속을 했기 때문에 꾸준히 하는 동기가 생겨요.
          </p>
          <p className="text-muted-foreground font-medium">
            다른 사람들의 댓글을 읽는 맛도 쏠쏠합니다.
          </p>
        </CardContent>
        <MockCommentRow />
      </Card>

      {/* 3번째 목표 섹션 */}
      <Card className="bg-muted/10 border-none">
        <CardHeader>
          <CardTitle className="text-xl font-bold">생각의 깊이</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            사실 직접 써보기 전에는 무슨 말을 할지 모르는 경우가 많아요.
          </p>
          <p className="text-muted-foreground">
            뭐라도 쓰려다 보면 할 말이 생깁니다.
          </p>
          <p className="text-muted-foreground">
            매일 글쓰기는 머릿속에서 하고 싶은 말을 캐내는 일입니다.
          </p>
          <p className="text-muted-foreground font-medium">
            그걸 골라서 다듬으면, 깊이 있는 생각으로 거듭나는 거죠.
          </p>
          <p className="text-muted-foreground font-medium">
            쓰는 습관은 남들과는 다른 생각의 깊이를 만들어줍니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 