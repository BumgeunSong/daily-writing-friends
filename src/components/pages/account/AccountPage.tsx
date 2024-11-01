import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { fetchUserData } from '../../../utils/userUtils'
import { User } from '../../../types/User'
import { auth } from '../../../firebase'
import { signOut } from 'firebase/auth'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Edit, LogOut } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useNavigate } from 'react-router-dom'

export default function AccountPage() {
  const { currentUser } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const getUserData = async () => {
      if (currentUser) {
        try {
          const data = await fetchUserData(currentUser.uid)
          setUserData(data)
        } catch (error) {
          console.error('Error fetching user data:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    getUserData()
  }, [currentUser])

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login'); // 로그아웃 후 로그인 페이지로 이동
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  }

  const handleEditProfile = () => {
    if (userData) {
      navigate('/account/edit', { state: { userData } }); // Pass userData to EditAccountPage
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center p-4 pt-8">
        <Skeleton className="w-32 h-32 rounded-full mb-4" />
        <Skeleton className="h-4 w-[250px] mb-2" />
        <Skeleton className="h-4 w-[200px] mb-4" />
        <Skeleton className="h-4 w-[300px] mb-2" />
        <Skeleton className="h-4 w-[250px] mb-4" />
        <Skeleton className="h-10 w-[200px]" />
      </div>
    )
  }

  if (!userData) {
    return <div className="text-center p-4 pt-8">No user data found.</div>
  }

  return (
    <div className="flex flex-col items-center p-4 pt-8 bg-gray-50 min-h-screen">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-gray-900 to-black" />
        <div className="flex flex-col items-center -mt-16 relative z-10">
          <img
            src={userData.profilePhotoURL || '/placeholder.svg?height=128&width=128'}
            alt={`${userData.nickname}'s profile`}
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg mb-4"
          />
          <CardContent className="text-center w-full">
            <h2 className="text-2xl font-bold mb-4">{userData.nickname}</h2>
            <div className="space-y-2 mb-6">
              <p className="text-sm">
                <span className="font-semibold">Email:</span> {userData.email}
              </p>
              <p className="text-sm">
                <span className="font-semibold">자기소개:</span> {userData.bio || '아직 자기소개가 없어요.'}
              </p>
            </div>
            <div className="space-y-4">
              <Button
                className="w-full transition-all duration-300 ease-in-out transform hover:scale-105"
                onClick={handleEditProfile}
              >
                <Edit className="w-4 h-4 mr-2" />
                내 정보 수정하기
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>로그아웃 하시겠습니까?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSignOut}>확인</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}