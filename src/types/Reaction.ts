/**
 * 반응(Reaction) 데이터 모델 인터페이스
 * 댓글이나 답글에 대한 이모지 반응을 나타냅니다.
 */
export interface Reaction {
    id: string;
    content: string; // 이모지
    createdAt: Date; // 생성 시간
    reactionUser: {
        userId: string;
        userName: string;
        userProfileImage: string;
    };
}

export interface ReactionUser {
    userId: string;
    userName: string;
    userProfileImage: string;
}

export interface GroupedReaction {
    content: string; // 이모지
    by: ReactionUser[];
}