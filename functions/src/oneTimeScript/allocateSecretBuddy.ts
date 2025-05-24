import admin from '../admin';

// Remote Config에서 active_board_id 가져오기
async function getActiveBoardId(): Promise<string> {
  const remoteConfig = admin.remoteConfig();
  const template = await remoteConfig.getTemplate();
  const param = template.parameters['active_board_id'];
  const value = param?.defaultValue && (param.defaultValue as any).value;
  if (!value) {
    throw new Error('active_board_id가 Remote Config에 존재하지 않습니다.');
  }
  return String(value);
}

// 활성 유저 정보 타입
interface ActiveUser {
  uid: string;
  nickname: string | null;
  profilePhotoURL: string | null;
  boardPermissions: Record<string, string>;
}

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// buddy 순환 할당
function assignBuddies(users: ActiveUser[]) {
  if (users.length < 2) throw new Error('활성 유저가 2명 이상이어야 합니다.');
  const shuffled = shuffle(users);
  const buddyPairs = shuffled.map((user, idx) => {
    const knownBuddy = shuffled[(idx + 1) % shuffled.length];
    return {
      user: {
        uid: user.uid,
        nickname: user.nickname,
        profilePhotoURL: user.profilePhotoURL,
      },
      knownBuddy: {
        uid: knownBuddy.uid,
        nickname: knownBuddy.nickname,
        profilePhotoURL: knownBuddy.profilePhotoURL,
      },
    };
  });
  return buddyPairs;
}

async function getActiveUsers(activeBoardId: string) {
  const db = admin.firestore();
  // 모든 user 조회
  const usersSnap = await db.collection('users').get();
  // boardPermissions에 activeBoardId가 있고, 값이 read 또는 write인 유저만 필터링
  const activeUsers: ActiveUser[] = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    const boardPermissions = data.boardPermissions || {};
    if (boardPermissions[activeBoardId] === 'read' || boardPermissions[activeBoardId] === 'write') {
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
  try {
    const activeBoardId = await getActiveBoardId();
    console.log('active_board_id:', activeBoardId);
    const activeUsers = await getActiveUsers(activeBoardId);
    console.log('활성 유저 수:', activeUsers.length);
    if (activeUsers.length < 2) {
      throw new Error('활성 유저가 2명 이상이어야 buddy 할당이 가능합니다.');
    }
    const buddyPairs = assignBuddies(activeUsers);
    console.log('버디 매칭 결과:');
    buddyPairs.forEach(pair => {
      console.log(`User(${pair.user.uid}, ${pair.user.nickname}) → KnownBuddy(${pair.knownBuddy.uid}, ${pair.knownBuddy.nickname})`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
