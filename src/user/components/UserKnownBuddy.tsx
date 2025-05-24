import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Link } from "react-router-dom";
import { useCurrentUserKnownBuddy } from '../hooks/useCurrentUserKnownBuddy';

export function UserKnownBuddy() {
    const { knownBuddy, isLoading, error } = useCurrentUserKnownBuddy();
    if (isLoading) return <div>로딩 중...</div>;
    if (error) return <div>에러 발생: {String(error)}</div>;
    if (!knownBuddy) return null;
    return (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-tr from-orange-100 via-pink-100 to-purple-100 flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">비밀 친구</span>
            <Link to={`/user/${knownBuddy.uid}`} className="flex items-center gap-2 group">
                <Avatar className="size-9">
                    <AvatarImage src={knownBuddy.profilePhotoURL || ''} alt={knownBuddy.nickname || 'Buddy'} />
                    <AvatarFallback>{knownBuddy.nickname?.[0] || 'B'}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-gray-900 group-hover:underline">{knownBuddy.nickname}</span>
            </Link>
        </div>
    )
}