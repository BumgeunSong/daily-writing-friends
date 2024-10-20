import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

const AppHeader: React.FC = () => {
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
                <h1 className="text-2xl font-bold sm:text-3xl">매일 글쓰기 프렌즈</h1>
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

export default AppHeader