import { Reaction } from "../model/Reaction";

/**
 * 리액션을 이모지별로 그룹화하여 반환합니다.
 * 
 * @param reactions 리액션 목록
 * @returns 이모지별로 그룹화된 리액션 목록
 */
export function groupReactionsByEmoji(reactions: Reaction[]): {
    content: string;
    by: Array<{
        userId: string;
        userName: string;
        userProfileImage: string;
    }>;
}[] {
    const groupedReactions = reactions.reduce((acc, reaction) => {
        const { content, reactionUser } = reaction;

        // 이미 해당 이모지 그룹이 있는지 확인
        const existingGroup = acc.find(group => group.content === content);

        if (existingGroup) {
            // 이미 해당 사용자가 그룹에 있는지 확인
            const userExists = existingGroup.by.some(user => user.userId === reactionUser.userId);

            if (!userExists) {
                existingGroup.by.push({
                    userId: reactionUser.userId,
                    userName: reactionUser.userName,
                    userProfileImage: reactionUser.userProfileImage
                });
            }
        } else {
            // 새 그룹 생성
            acc.push({
                content,
                by: [{
                    userId: reactionUser.userId,
                    userName: reactionUser.userName,
                    userProfileImage: reactionUser.userProfileImage
                }]
            });
        }

        return acc;
    }, [] as Array<{
        content: string;
        by: Array<{
            userId: string;
            userName: string;
            userProfileImage: string;
        }>;
    }>);

    // 리액션 수가 많은 순서로 정렬
    return groupedReactions.sort((a, b) => b.by.length - a.by.length);
}