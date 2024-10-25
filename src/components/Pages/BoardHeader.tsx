import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../ui/button';
import { LogOut, ChevronDown } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

interface BoardHeadderProps {
    title: string;
}

const BoardHeader: React.FC<BoardHeadderProps> = ({ title }) => {
    const navigate = useNavigate();
    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login'); // 로그아웃 후 로그인 페이지로 이동
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }
    };

    return (
        <header className="bg-primary text-primary-foreground py-4">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link
                    to="/boards"
                    className="flex items-center space-x-2 p-2 rounded hover:bg-primary-foreground/10 transition"
                >
                    <span className="text-2xl font-bold sm:text-3xl">{title}</span>
                    <ChevronDown className="h-5 w-5" />
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                    aria-label="Sign out"
                >
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </header>
    )
}

export default BoardHeader