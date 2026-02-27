import { useState } from "react"
import { toast } from "sonner"
import type { Board } from "@/board/model/Board"
import { showErrorToast } from "@/login/components/showErrorToast"
import { useIsUserInWaitingList } from "@/login/hooks/useIsUserInWaitingList"
import { useUpcomingBoard } from "@/login/hooks/useUpcomingBoard"
import type { JoinFormDataForNewUser } from "@/login/model/join"
import { useAuth } from '@/shared/hooks/useAuth'
import { addUserToBoardWaitingList } from "@/board/utils/boardUtils"
import { updateUser, createUserIfNotExists } from "@/user/api/user"
import { useUserNickname } from "@/user/hooks/useUserNickname"
import type { User as FirebaseUser } from 'firebase/auth'
import JoinCompletePage from "./JoinCompletePage"
import JoinFormCardForNewUser from './JoinFormCardForNewUser'
import FormHeader from "./JoinFormHeader"

/**
 * 신규 사용자를 위한 매글프 신청 폼 페이지 컴포넌트
 */
export default function JoinFormPageForNewUser() {
    const { currentUser } = useAuth()
    const { data: upcomingBoard, isLoading: isBoardLoading } = useUpcomingBoard()
    const { isInWaitingList, isLoading: isCheckingWaitingList } = useIsUserInWaitingList()
    const { nickname, isLoading: isNicknameLoading } = useUserNickname(currentUser?.uid)
    const [isComplete, setIsComplete] = useState(false)
    const [completeInfo, setCompleteInfo] = useState<{ name: string, cohort: number } | null>(null)
    const { title, subtitle } = titleAndSubtitle(upcomingBoard)

    /**
     * 폼 제출 핸들러
     */
    const handleSubmit = async (data: JoinFormDataForNewUser) => {
        if (!currentUser?.uid) {
            showErrorToast(toast, new Error("로그인 상태가 만료되었습니다. 다시 로그인해주세요."));
            return;
        }
        if (!upcomingBoard?.id) {
            showErrorToast(toast, new Error("신청 가능한 기수 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요."));
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

    const isLoading = isBoardLoading || isCheckingWaitingList || (isInWaitingList && isNicknameLoading);

    if (isLoading) {
        return null;
    }

    const shouldShowCompletePage = (isComplete && completeInfo) || isInWaitingList;

    if (shouldShowCompletePage) {
        const userNameForCompletePage = completeInfo?.name || nickname || "";
        const cohortForCompletePage = completeInfo?.cohort || upcomingBoard?.cohort || 0;
        return <JoinCompletePage name={userNameForCompletePage} cohort={cohortForCompletePage} />
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
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
    currentUser: FirebaseUser;
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

        await createUserIfNotExists(currentUser);

        const submittedDataByUser = {
            realName: data.name,
            phoneNumber: data.phoneNumber,
            nickname: data.nickname,
            referrer: data.referrer,
        };

        await updateUser(currentUser.uid, submittedDataByUser);

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