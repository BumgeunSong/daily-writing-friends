import { useState } from 'react';

export function useNickname(initialNickname: string) {
  const [nickname, setNickname] = useState<string>(initialNickname);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
  };

  return { nickname, handleNicknameChange };
}