import { useQuery } from '@tanstack/react-query'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { FirebaseMessagingTokenWithUser, User } from '../types/firestore'

/**
 * 모든 유저의 firebaseMessagingTokens 서브컬렉션을 순회하여 토큰+유저정보를 가져오는 훅
 */
export function useAllFCMTokens() {
  return useQuery<FirebaseMessagingTokenWithUser[]>({
    queryKey: ['all-fcm-tokens'],
    queryFn: async () => {
      const db = getFirestore()
      const usersCol = collection(db, 'users')
      const usersSnap = await getDocs(usersCol)
      const result: FirebaseMessagingTokenWithUser[] = []

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data() as Omit<User, 'id'>
        const user: User = { id: userDoc.id, ...userData }
        const tokensCol = collection(db, 'users', userDoc.id, 'firebaseMessagingTokens')
        const tokensSnap = await getDocs(tokensCol)
        for (const tokenDoc of tokensSnap.docs) {
          const tokenData = tokenDoc.data()
          result.push({
            id: tokenDoc.id,
            token: tokenData.token,
            timestamp: tokenData.timestamp,
            userAgent: tokenData.userAgent ?? null,
            user,
          })
        }
      }
      return result
    },
  })
} 