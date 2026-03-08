/**
 * Content data for the freewriting tutorial page
 */

export interface TutorialCard {
  emoji: string
  title: string
  description: string
}

export const FREEWRITING_TUTORIAL_TITLE = "프리라이팅"
export const FREEWRITING_TUTORIAL_SUBTITLE = "머릿속의 편집자를 끄고 목표 시간 동안 써보기"

export const FREEWRITING_TUTORIAL_CARDS: TutorialCard[] = [
  {
    emoji: "✋",
    title: "절대 멈추지 마세요",
    description: "막히더라도 손을 멈추지 마세요. '뭘 써야 할지 모르겠다'라고 계속 써도 괜찮아요. 같은 단어를 반복해도 좋습니다. 중요한 건 계속 쓰는 것이에요."
  },
  {
    emoji: "🔒",
    title: "비공개 글쓰기",
    description: "프리라이팅으로 쓴 글은 다른 멤버들에게 보이지 않아요. 하지만 잔디는 심어지고, 본인은 볼 수 있어요."
  },
  {
    emoji: "⏰",
    title: "목표 시간을 채워보세요",
    description: "글을 쓰는 동안 시간이 올라갑니다. 목표 시간을 채워야 업로드할 수 있어요! 중간에 나오면 글은 사라져요."
  },
  {
    emoji: "🗑️",
    title: "똥글도 괜찮아요",
    description: "좋은 글이 나오지 않아도 상관없습니다. 프리라이팅의 대부분은 엉성할 거예요. 하지만 그 속에서 나오는 좋은 아이디어들은 다른 방법으로는 얻을 수 없는 소중한 것들이에요."
  },
  {
    emoji: "🔄",
    title: "규칙적으로 연습하기",
    description: "매일 프리라이팅을 하면 글쓰기가 훨씬 자유로워져요. 머릿속 편집자의 간섭 없이 생각을 글로 옮기는 근육이 생깁니다."
  },
  {
    emoji: "🧲",
    title: "끝나고 요약하기",
    description: "그냥 프리라이팅만 하고 끝나면 남는 게 없다고 느낄 수 있어요. 프리라이팅이 끝나면, 그 안에서 중요하다고 느껴지는 부분을 골라 요약해보세요. 새로운 관점과 아이디어를 찾을 수 있습니다. 이 아이디어는 진솔한 글을 쓰기 위한 밑바탕이 돼요."
  }
]
