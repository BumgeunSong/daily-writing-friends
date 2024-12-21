import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2 } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { storage } from '../../../firebase';
import { User } from '../../../types/User';
import { updateUserData } from '../../../utils/userUtils';
import { cropAndResizeImage } from '../../../utils/ImageUtils';

export default function EditAccountPage() {
  const location = useLocation();
  const { userData } = location.state as { userData: User };
  const [nickname, setNickname] = useState<string>(userData.nickname || '');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(userData.profilePhotoURL || '');
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      cropAndResizeImage(file, (resizedFile) => {
        setProfilePhoto(resizedFile);
        setPreviewUrl(URL.createObjectURL(resizedFile));
      });
    }
  };

  const uploadProfilePhoto = async (file: File, userId: string) => {
    const storageRef = ref(storage, `profilePhotos/${userId}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUserData(userData.uid, { nickname });

      if (profilePhoto) {
        const downloadURL = await uploadProfilePhoto(profilePhoto, userData.uid);
        await updateUserData(userData.uid, { profilePhotoURL: downloadURL });
      }

      navigate('/account');
    } catch (error) {
      console.error('Error updating account information:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-start justify-center bg-gray-50 p-4 relative'>
      {loading && (
        <div className='absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50'>
          <Loader2 className='size-8 animate-spin text-gray-600' />
        </div>
      )}
      <Card className={`w-full max-w-md ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader>
          <CardTitle className='text-center text-2xl font-bold'>내 정보 수정하기</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-6'>
            <div className='flex flex-col items-center space-y-4'>
              <Avatar
                className='size-32 cursor-pointer'
                onClick={() => !loading && fileInputRef.current?.click()}
              >
                <AvatarImage src={previewUrl} alt={nickname} />
                <AvatarFallback className='flex items-center justify-center bg-gray-200 text-4xl text-gray-600'>
                  {nickname ? nickname[0].toUpperCase() : <Camera className='size-8' />}
                </AvatarFallback>
              </Avatar>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='mt-2'
                onClick={() => !loading && fileInputRef.current?.click()}
                disabled={loading}
              >
                프로필 사진 변경
              </Button>
              <Input
                type='file'
                accept='image/*'
                onChange={handleProfilePhotoChange}
                className='hidden'
                ref={fileInputRef}
                disabled={loading}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='nickname'>닉네임</Label>
              <Input
                id='nickname'
                type='text'
                value={nickname}
                onChange={handleNicknameChange}
                placeholder='새로운 닉네임을 입력하세요'
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className='flex justify-between gap-4'>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={() => navigate('/account')}
              disabled={loading}
            >
              취소
            </Button>
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? <Loader2 className='size-4 animate-spin' /> : '저장하기'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
