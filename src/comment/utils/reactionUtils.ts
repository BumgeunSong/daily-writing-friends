import {
    collection,
    doc,
    addDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    DocumentReference
} from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Reaction } from '@/comment/model/Reaction';

/**
 * 리액션 생성에 필요한 파라미터 인터페이스
 */
export interface CreateReactionParams {
    // 엔티티 식별자
    boardId: string;
    postId: string;
    commentId: string;
    replyId?: string; // 답글에 대한 리액션인 경우에만 필요

    // 리액션 데이터
    content: string; // 이모지
    reactionUser: {
        userId: string;
        userName: string;
        userProfileImage: string;
    };
}

/**
 * 리액션 삭제에 필요한 파라미터 인터페이스
 */
export interface DeleteReactionParams {
    boardId: string;
    postId: string;
    commentId: string;
    replyId?: string; // 답글에 대한 리액션인 경우에만 필요
    reactionId: string;
}

/**
 * 리액션 조회에 필요한 파라미터 인터페이스
 */
export interface GetReactionsParams {
    boardId: string;
    postId: string;
    commentId: string;
    replyId?: string; // 답글에 대한 리액션인 경우에만 필요
}

/**
 * 리액션이 속한 엔티티(댓글 또는 답글)의 참조를 가져옵니다.
 * 
 * @param params 엔티티 식별자
 * @returns Firestore 문서 참조
 */
function getEntityRef(params: {
    boardId: string;
    postId: string;
    commentId: string;
    replyId?: string;
}): DocumentReference {
    const { boardId, postId, commentId, replyId } = params;

    // 기본 경로: 댓글에 대한 리액션
    let entityPath = `boards/${boardId}/posts/${postId}/comments/${commentId}`;

    // 답글에 대한 리액션인 경우 경로 확장
    if (replyId) {
        entityPath += `/replies/${replyId}`;
    }

    return doc(firestore, entityPath);
}

/**
 * 새로운 리액션을 생성하고 Firestore에 저장합니다.
 * 
 * @param params 리액션 생성에 필요한 파라미터
 * @returns 생성된 리액션의 ID
 */
export async function createReaction(params: CreateReactionParams): Promise<string> {
    try {
        const { content, reactionUser } = params;
        const entityRef = getEntityRef(params);

        // 이미 동일한 사용자가 동일한 이모지로 리액션했는지 확인
        const reactionsRef = collection(entityRef, 'reactions');
        const existingQuery = query(
            reactionsRef,
            where('content', '==', content),
            where('reactionUser.userId', '==', reactionUser.userId)
        );

        const existingSnapshot = await getDocs(existingQuery);

        // 이미 존재하는 경우 기존 ID 반환
        if (!existingSnapshot.empty) {
            return existingSnapshot.docs[0].id;
        }

        // 새 리액션 문서 생성
        const newReactionData = {
            content,
            createdAt: serverTimestamp(),
            reactionUser
        };

        const newReactionRef = await addDoc(reactionsRef, newReactionData);
        return newReactionRef.id;
    } catch (error) {
        console.error('리액션 생성 중 오류 발생:', error);
        throw new Error('리액션을 생성하는 데 실패했습니다.');
    }
}

/**
 * 특정 리액션을 Firestore에서 삭제합니다.
 * 
 * @param params 리액션 삭제에 필요한 파라미터
 */
export async function deleteReaction(params: DeleteReactionParams): Promise<void> {
    try {
        const { reactionId } = params;
        const entityRef = getEntityRef(params);

        // 리액션 문서 참조 생성
        const reactionRef = doc(entityRef, 'reactions', reactionId);

        // 리액션 문서 삭제
        await deleteDoc(reactionRef);
    } catch (error) {
        console.error('리액션 삭제 중 오류 발생:', error);
        throw new Error('리액션을 삭제하는 데 실패했습니다.');
    }
}

/**
 * 특정 사용자의 리액션을 삭제합니다.
 * 
 * @param params 엔티티 식별자
 * @param userId 사용자 ID
 * @param content 이모지 내용
 */
export async function deleteUserReaction(
    params: GetReactionsParams,
    userId: string,
    content: string
): Promise<void> {
    try {
        const entityRef = getEntityRef(params);
        const reactionsRef = collection(entityRef, 'reactions');

        // 특정 사용자의 특정 이모지 리액션 쿼리
        const userReactionQuery = query(
            reactionsRef,
            where('reactionUser.userId', '==', userId),
            where('content', '==', content)
        );

        const snapshot = await getDocs(userReactionQuery);

        // 일치하는 리액션이 없으면 종료
        if (snapshot.empty) {
            return;
        }

        // 일치하는 리액션 삭제
        const reactionDoc = snapshot.docs[0];
        await deleteDoc(reactionDoc.ref);
    } catch (error) {
        console.error('사용자 리액션 삭제 중 오류 발생:', error);
        throw new Error('사용자 리액션을 삭제하는 데 실패했습니다.');
    }
}

/**
 * 특정 엔티티(댓글 또는 답글)에 대한 모든 리액션을 가져옵니다.
 * 
 * @param params 리액션 조회에 필요한 파라미터
 * @returns 리액션 목록
 */
export async function getReactions(params: GetReactionsParams): Promise<Reaction[]> {
    try {
        const entityRef = getEntityRef(params);
        const reactionsRef = collection(entityRef, 'reactions');

        const snapshot = await getDocs(reactionsRef);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            content: doc.data().content,
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            reactionUser: doc.data().reactionUser
        }));
    } catch (error) {
        console.error('리액션 조회 중 오류 발생:', error);
        throw new Error('리액션을 조회하는 데 실패했습니다.');
    }
}

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