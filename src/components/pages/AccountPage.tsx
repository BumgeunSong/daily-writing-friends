'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchUserData } from '../../utils/userUtils'
import { User } from '../../types/User'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Edit } from 'lucide-react'

export default function AccountPage() {
  const { currentUser } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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
            <h2 className="text-2xl font-bold mb-1">{userData.realName}</h2>
            <p className="text-gray-600 mb-4">@{userData.nickname}</p>
            <div className="space-y-2 mb-6">
              <p className="text-sm">
                <span className="font-semibold">Email:</span> {userData.email}
              </p>
              <p className="text-sm">
                <span className="font-semibold">자기소개:</span> {userData.bio || '아직 자기소개가 없어요.'}
              </p>
            </div>
            <Button 
              className="w-full transition-all duration-300 ease-in-out transform hover:scale-105"
              onClick={() => {
                // Add logic to navigate to edit page or open edit modal
                console.log('Edit button clicked')
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              내 정보 수정하기
            </Button>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}