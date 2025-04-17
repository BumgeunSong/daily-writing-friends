import { useState } from "react"
import { JoinFormDataForNewUser } from "@/types/join"
import FormHeader from "./JoinFormHeader"
import JoinFormCardForNewUser from "./JoinFormCardForNewUser"
import { updateUserData } from "@/utils/userUtils"
import { addUserToBoardWaitingList } from "@/utils/boardUtils"
import { useToast } from "@/hooks/use-toast"
import { useUpcomingBoard } from "@/hooks/useUpcomingBoard"
import JoinCompletePage from "../complete/JoinCompletePage"
import { useAuth } from "@/contexts/AuthContext"
import { Board } from "@/types/Board"
import { showErrorToast } from "@/components/common/showErrorToast"

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
            userId: currentUser.uid
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
        <div className="min-h-screen bg-gradient-to-b from-background to-slate-50 flex flex-col">
            <div className="max-w-3xl lg:max-w-4xl mx-auto w-full px-4 py-8 flex-1">
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
    userId: string;
}): Promise<{ success: true; name: string; cohort: number } | { success: false; error: Error }> {
    const { data, upcomingBoard, userId } = params;

    try {
        // 필수 값 검증
        if (!upcomingBoard.id) {
            throw new Error("신청 가능한 기수 정보를 찾을 수 없습니다.");
        }

        if (!userId) {
            throw new Error("사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.");
        }

        // 사용자 정보 업데이트
        await updateUserData(userId, {
            realName: data.name,
            phoneNumber: data.phoneNumber,
            nickname: data.nickname,
            referrer: data.referrer
        });

        // 대기자 명단에 추가
        const result = await addUserToBoardWaitingList(upcomingBoard.id, userId);
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