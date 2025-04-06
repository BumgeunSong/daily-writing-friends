import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    // 서버 사이드 렌더링 환경에서는 window가 없을 수 있음
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query)
      
      // 초기값 설정
      setMatches(media.matches)
      
      // 미디어 쿼리 변경 감지 함수
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches)
      }
      
      // 이벤트 리스너 등록
      media.addEventListener('change', listener)
      
      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        media.removeEventListener('change', listener)
      }
    }
    
    // 기본값은 false (서버 사이드 렌더링 시)
    return () => {}
  }, [query])
  
  return matches
} 