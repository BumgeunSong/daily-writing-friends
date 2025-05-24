import * as admin from 'firebase-admin';

// Firebase Admin 초기화 (환경에 따라 수정 필요)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// 활성 유저 정보 타입
interface ActiveUser {
  uid: string;
  nickname: string | null;
  profilePhotoURL: string | null;
  boardPermissions: Record<string, string>;
}

async function getActiveUsers() {
  // 1. 모든 boardId 조회
  const boardsSnap = await db.collection('boards').get();
  const boardIds = boardsSnap.docs.map(doc => doc.id);

  // 2. 모든 user 조회
  const usersSnap = await db.collection('users').get();

  // 3. boardPermissions로 필터링
  const activeUsers: ActiveUser[] = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    const boardPermissions = data.boardPermissions || {};
    // boardPermissions에 boardId가 하나라도 있으면 활성 유저로 간주
    const isActive = boardIds.some(boardId =>
      boardPermissions[boardId] === 'read' || boardPermissions[boardId] === 'write'
    );
    if (isActive) {
      activeUsers.push({
        uid: data.uid,
        nickname: data.nickname ?? null,
        profilePhotoURL: data.profilePhotoURL ?? null,
        boardPermissions,
      });
    }
  });
  return activeUsers;
}

// 실행부
(async () => {
  const activeUsers = await getActiveUsers();
  console.log('활성 유저 수:', activeUsers.length);
  console.log('활성 유저 목록:', activeUsers.map(u => ({ uid: u.uid, nickname: u.nickname, profilePhotoURL: u.profilePhotoURL })));
  process.exit(0);
})();
