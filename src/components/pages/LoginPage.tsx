import { signInWithGoogle } from '../../firebase'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { createUserData, fetchUserData } from '@/utils/userUtils'
import { User } from '@/types/User'
import { UserCredential } from 'firebase/auth'

export default function LoginPage() {
  const { loading } = useAuth()

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithGoogle()
      await ensureUserDataInFirestore(userCredential)
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  const ensureUserDataInFirestore = async (userCredential: UserCredential) => {
    // Fetch user data from Firestore
    const userData = await fetchUserData(userCredential.user.uid)
    if (!userData) {
      // Create user data in Firestore
      const newUser: User = {
        uid: userCredential.user.uid,
        displayName: userCredential.user.displayName,
        nickname: userCredential.user.displayName,
        email: userCredential.user.email,
        profilePhotoURL: userCredential.user.photoURL,
        bio: null,
        boardPermissions: {
          '5pxedM1zGP4GbH7sx1X2': 'write', // default board id
        },
      }
      await createUserData(newUser)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-muted-foreground">로그인 중...</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">매일 글쓰기 프렌즈</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <img src="/pencil_icon.svg" alt="Logo" className="w-16 h-16" />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleLogin}
            className="w-full"
          >
            구글로 로그인하기
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}