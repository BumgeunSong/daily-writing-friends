import { Workbox } from 'workbox-window';

// 서비스 워커 등록
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox(`${process.env.PUBLIC_URL}/service-worker.js`);
    
    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        console.log('서비스 워커가 업데이트되었습니다.');
        // 필요한 경우 사용자에게 새로고침 요청
        if (confirm('새 버전이 사용 가능합니다. 새로고침하시겠습니까?')) {
          window.location.reload();
        }
      } else {
        console.log('서비스 워커가 설치되었습니다. 오프라인 기능이 활성화되었습니다.');
      }
    });
    
    wb.addEventListener('activated', () => {
      console.log('서비스 워커가 활성화되었습니다.');
    });
    
    wb.addEventListener('controlling', () => {
      console.log('서비스 워커가 제어 중입니다.');
    });
    
    wb.addEventListener('waiting', () => {
      console.log('서비스 워커가 대기 중입니다.');
    });
    
    wb.register();
    
    return wb;
  }
  
  return null;
}

// 캐시 삭제 요청
export function clearCache() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: 'CLEAR_CACHE' });
    });
  }
}

// 게시판 캐시 무효화 요청
export function invalidateBoardCache(boardId: string) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ 
        type: 'INVALIDATE_BOARD_CACHE',
        boardId
      });
    });
  }
} 