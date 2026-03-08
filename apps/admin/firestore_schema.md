# Firestore 데이터베이스 스키마

## 컬렉션 구조 요약
- **users**: 사용자 정보 및 관련 서브컬렉션
- **boards**: 게시판 정보 및 게시물, 댓글 관련 서브컬렉션

---

## users 컬렉션
**문서 ID**: `{userId}`

### 필드
| 필드명 | 타입 | 설명 |
|---------|------|------|
| uid | string | 사용자 고유 식별자 |
| realName | string \| null | 사용자 실명 |
| nickname | string \| null | 사용자 별명 |
| email | string \| null | 이메일 주소 |
| profilePhotoURL | string \| null | 프로필 사진 URL |
| bio | string \| null | 자기소개 |
| phoneNumber | string \| null | 전화번호 |
| referrer | string \| null | 추천인
| boardPermissions | map | 게시판 접근 권한 `{ [boardId]: 'read' \| 'write' }` |

### 서브컬렉션

#### notifications
**문서 ID**: `{notificationId}`

| 필드명 | 타입 | 설명 |
|---------|------|------|
| id | string | 알림 고유 식별자 |
| type | enum | 알림 타입 (COMMENT_ON_POST, REPLY_ON_COMMENT, REPLY_ON_POST) |
| boardId | string | 관련 게시판 ID |
| postId | string | 관련 게시물 ID |
| commentId | string? | 관련 댓글 ID (선택 사항) |
| replyId | string? | 관련 답글 ID (선택 사항) |
| fromUserId | string | 알림 발신 사용자 ID |
| fromUserProfileImage | string? | 발신 사용자 프로필 이미지 (선택 사항) |
| message | string | 알림 메시지 |
| timestamp | Timestamp | 알림 생성 시간 |
| read | boolean | 읽음 상태 |

#### writingHistories
**문서 ID**: `{writingHistoryId}`

| 필드명 | 타입 | 설명 |
|---------|------|------|
| day | string | 날짜 (YYYY-MM-DD 형식) |
| createdAt | Timestamp | 생성 시간 |
| board.id | string | 게시판 ID |
| post.id | string | 게시물 ID |
| post.contentLength | number | 게시물 내용 길이 |

#### firebaseMessagingTokens
**문서 ID**: `{firebaseMessagingTokenId}`
| 필드명 | 타입 | 설명 |
|---------|------|------|
| token | string | firebase messaging token |
| timestamp | string | 생성 시간 |
| userAgent | string? | 디바이스 토큰 등록 시의 userAgent |


#### postings
**문서 ID**: `{postingId}`

| 필드명 | 타입 | 설명 |
|---------|------|------|
| board.id | string | 게시판 ID |
| post.id | string | 게시물 ID |
| post.title | string | 게시물 제목 |
| post.contentLength | number | 게시물 내용 길이 |
| createdAt | Timestamp | 생성 시간 |

#### commentings
**문서 ID**: `{commentingId}`

| 필드명 | 타입 | 설명 |
|---------|------|------|
| board.id | string | 게시판 ID |
| post.id | string | 게시물 ID |
| post.authorId | string | 게시물 작성자 ID |
| comment.id | string | 댓글 ID |
| createdAt | Timestamp | 생성 시간 |

#### replyings
**문서 ID**: `{replyingId}`

| 필드명 | 타입 | 설명 |
|---------|------|------|
| board.id | string | 게시판 ID |
| post.id | string | 게시물 ID |
| post.authorId | string | 게시물 작성자 ID |
| comment.id | string | 댓글 ID |
| comment.authorId | string | 댓글 작성자 ID |
| reply.id | string | 답글 ID |
| createdAt | Timestamp | 생성 시간 |

---

## boards 컬렉션
**문서 ID**: `{boardId}`

### 필드
| 필드명 | 타입 | 설명 |
|---------|------|------|
| id | string | 게시판 고유 식별자 |
| title | string | 게시판 제목 |
| description | string | 게시판 설명 |
| createdAt | Date | 생성 시간 |
| firstDay | Timestamp? | 시작일 (선택 사항) |
| cohort | number? | 코호트 번호 (선택 사항) |
| waitingUsersIds | string[] | 대기 중인 사용자 ID 목록 |

### 서브컬렉션

#### reviews
**문서 구조**:

| 필드명 | 타입 | 설명 |
|---------|------|------|
| createdAt | Timestamp | 생성 시간 |
| keep | string | 유지할 사항 |
| nps | number | NPS 점수 |
| problem | string | 문제점 |
| reviewer | map | 리뷰어 정보 |
| reviewer.nickname | string | 리뷰어 별명 |
| reviewer.uid | string | 리뷰어 ID |
| try | string | 시도할 사항 |
| willContinue | string | 계속 여부 |

#### posts
**문서 ID**: `{postId}`

| 필드명 | 타입 | 설명 |
|---------|------|------|
| id | string | 게시물 고유 식별자 |
| boardId | string | 게시판 ID |
| title | string | 게시물 제목 |
| content | string | 게시물 내용 |
| thumbnailImageURL | string? | 썸네일 이미지 URL (선택 사항) |
| authorId | string | 작성자 ID |
| authorName | string | 작성자 이름 |
| createdAt | Date? | 생성 시간 (선택 사항) |
| updatedAt | Date? | 수정 시간 (선택 사항) |
| countOfComments | number | 댓글 수 |
| countOfReplies | number | 답글 수 |
| weekDaysFromFirstDay | number? | 게시판 시작일로부터 경과된 주(週) (선택 사항) |

##### 서브컬렉션: comments
**문서 ID**: `{commentId}`

| 필드명 | 타입 | 설명 |
|---------|------|------|
| id | string | 댓글 고유 식별자 |
| content | string | 댓글 내용 |
| userId | string | 사용자 ID |
| userName | string | 사용자 이름 |
| userProfileImage | string | 사용자 프로필 이미지 |
| createdAt | Timestamp | 생성 시간 |

###### 서브컬렉션: replies
**문서 ID**: `{replyId}`

| 필드명 | 타입 | 설명 |
|---------|------|------|
| id | string | 답글 고유 식별자 |
| content | string | 답글 내용 |
| userId | string | 사용자 ID |
| userName | string | 사용자 이름 |
| userProfileImage | string | 사용자 프로필 이미지 |
| createdAt | Timestamp | 생성 시간 |

---

## 데이터 관계 요약

- **users** ↔ **boards**: `users.boardPermissions`를 통해 사용자가 접근할 수 있는 게시판 정의
- **users.postings** ↔ **boards.posts**: 사용자의 게시물 작성 기록 추적
- **users.commentings** ↔ **boards.posts.comments**: 사용자의 댓글 작성 기록 추적
- **users.replyings** ↔ **boards.posts.comments.replies**: 사용자의 답글 작성 기록 추적
- **users.notifications**: 다른 사용자의 활동(댓글, 답글 등)에 대한 알림
