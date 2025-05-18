import { useState } from "react"
import { showErrorToast } from "@/login/components/showErrorToast"
import { useUpcomingBoard } from "@/login/hooks/useUpcomingBoard"
import { JoinFormDataForNewUser } from "@/login/model/join"
import { useToast } from "@/shared/hooks/use-toast"
import { useAuth } from '@/shared/hooks/useAuth'
import { addUserToBoardWaitingList } from "@/shared/utils/boardUtils"
import { fetchUserFromFirestore, createUserInFirestore, updateUserInFirestore } from "@/user/api/user"
import JoinCompletePage from "./JoinCompletePage"
import JoinFormCardForNewUser from './JoinFormCardForNewUser'
import FormHeader from "./JoinFormHeader"
import { Board } from "@/board/model/Board"
import { User } from "@/user/model/User"

/**
 * 신규 사용자를 위한 매글프 신청 폼 페이지 컴포넌트
 */
export default function JoinFormPageForNewUser() {
    const { currentUser } = useAuth()
    const { toast } = useToast()
    const { data: upcomingBoard } = useUpcomingBoard()
    const [isComplete, setIsComplete] = useState(false)
    const [completeInfo, setCompleteInfo] = useState<{ name: string, cohort: number } | null>(null)
    const { title, subtitle } = titleAndSubtitle(upcomingBoard)
    
    /**
     * 폼 제출 핸들러
     */
    const handleSubmit = async (data: JoinFormDataForNewUser) => {
        if (!upcomingBoard?.id || !currentUser?.uid) {
            showErrorToast(toast, new Error("필수 정보가 누락되었습니다."));
            return;
        }

        const result = await submitNewUserJoin({
            data,
            upcomingBoard: upcomingBoard,
            currentUser: currentUser
        });

        if (result.success) {
            setCompleteInfo({
                name: result.name,
                cohort: result.cohort
            });
            setIsComplete(true);
        } else {
            showErrorToast(toast, result.error);
        }
    }

    if (isComplete && completeInfo) {
        return <JoinCompletePage name={completeInfo.name} cohort={completeInfo.cohort} />
    }

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-slate-50">
            <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 lg:max-w-4xl">
                <FormHeader title={title} subtitle={subtitle} />
                <JoinFormCardForNewUser onSubmit={handleSubmit} />
            </div>
        </div>
    )
}

/**
 * 신규 사용자의 폼 제출 처리를 위한 순수 함수
 * @param params 요청 파라미터
 * @returns 성공 시 사용자 정보, 실패 시 에러 객체
 */
export async function submitNewUserJoin(params: {
    data: JoinFormDataForNewUser;
    upcomingBoard: Board;
    currentUser: any;
}): Promise<{ success: true; name: string; cohort: number } | { success: false; error: Error }> {
    const { data, upcomingBoard, currentUser } = params;

    try {
        // 필수 값 검증
        if (!upcomingBoard.id) {
            throw new Error("신청 가능한 기수 정보를 찾을 수 없습니다.");
        }

        if (!currentUser.uid) {
            throw new Error("사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.");
        }

        // 사용자 정보 작성을 위한 데이터
        const userData = {
            realName: data.name,
            phoneNumber: data.phoneNumber,
            nickname: data.nickname || null,
            referrer: data.referrer || null
        };

        // Firestore에서 사용자 문서 확인
        const existingUser = await fetchUserFromFirestore(currentUser.uid);
        
        if (existingUser) {
            // 기존 사용자가 있으면 업데이트
            await updateUserInFirestore(currentUser.uid, userData);
        } else {
            // 기존 사용자가 없으면 새로 생성
            const newUser: User = {
                uid: currentUser.uid,
                email: currentUser.email || null,
                profilePhotoURL: currentUser.photoURL || null,
                bio: null,
                boardPermissions: {
                    'rW3Y3E2aEbpB0KqGiigd': 'read', // default board id
                },
                ...userData,
                updatedAt: null,
            };
            await createUserInFirestore(newUser);
        }

        // 대기자 명단에 추가
        const result = await addUserToBoardWaitingList(upcomingBoard.id, currentUser.uid);
        if (!result) {
            throw new Error("대기자 명단에 추가하는 중 오류가 발생했습니다.");
        }

        // 성공 정보 반환
        return {
            success: true,
            name: data.name,
            cohort: upcomingBoard.cohort ?? 0
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error("알 수 없는 오류가 발생했습니다.")
        };
    }
}

/**
 * 상황에 맞는 제목과 부제목을 생성합니다
 * @param upcomingBoard 다가오는 보드 정보
 * @returns {title: string, subtitle: string} 제목과 부제목
 */
function titleAndSubtitle(upcomingBoard: Board | null | undefined): { title: string, subtitle: string } {
    const title = upcomingBoard ? `매글프 ${upcomingBoard.cohort}기 신청하기` : "매일 글쓰기 프렌즈"

    const subtitle = upcomingBoard && upcomingBoard.firstDay
        ? `${upcomingBoard.firstDay.toDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}에 시작합니다.`
        : ""

    return { title, subtitle }
}