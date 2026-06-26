/**
 * Static preview content shown to logged-out prospects.
 *
 * The shapes here are intentionally decoupled from the real `Post`/`Comment`
 * models: each entry is hand-curated and pasted from the export pipeline
 * (design doc §5). The adapter in `../utils/toPostModel.ts` bridges these
 * shapes onto the reused presentational components.
 */

/** A preview-only author identity. IDs are synthetic (`pv-author-*`) so a visitor cannot probe `/user/:id`. */
export type PreviewAuthor = {
  id: string;
  displayName: string;
  profileImageURL: string;
};

/** A reply under a preview comment. `body` is pre-sanitized HTML exported at curation time. */
export type PreviewReply = {
  id: string;
  author: PreviewAuthor;
  /** Pre-sanitized HTML string. */
  body: string;
  /** ISO date string. */
  createdAt: string;
};

/** A top-level comment on a preview post. */
export type PreviewComment = {
  id: string;
  author: PreviewAuthor;
  /** Pre-sanitized HTML string. */
  body: string;
  /** ISO date string. */
  createdAt: string;
  replies: PreviewReply[];
};

/** A single handpicked preview post and its surrounding conversation. */
export type PreviewPost = {
  /** Used in URL: `/preview/post/:id`. Format decided at export time; accepts any string. */
  id: string;
  title: string;
  /** Pre-sanitized HTML string (full post body). */
  body: string;
  /** Plain-text or safe-HTML excerpt (~200 chars) rendered in the card's line-clamp. */
  contentPreview: string;
  author: PreviewAuthor;
  /** ISO date string. */
  createdAt: string;
  thumbnailImageURL: string | null;
  weekDaysFromFirstDay: number | null;
  /** Derived from `comments.length`. */
  countOfComments: number;
  /** Derived from `comments.flatMap(c => c.replies).length`. */
  countOfReplies: number;
  comments: PreviewComment[];
};

export const PREVIEW_BOARD_NAME = '매일 글쓰기 프렌즈 프리뷰';

const stubAuthor: PreviewAuthor = {
  id: 'pv-author-1',
  displayName: '이서연',
  profileImageURL: 'https://i.pravatar.cc/150?u=pv-author-1',
};

const stubCommenter: PreviewAuthor = {
  id: 'pv-author-2',
  displayName: '박지훈',
  profileImageURL: 'https://i.pravatar.cc/150?u=pv-author-2',
};

const stubReplier: PreviewAuthor = {
  id: 'pv-author-3',
  displayName: '최민아',
  profileImageURL: 'https://i.pravatar.cc/150?u=pv-author-3',
};

export const PREVIEW_POSTS: PreviewPost[] = [
  {
    id: 'pv-post-1',
    title: '아침 6시에 일어나기로 한 지 일주일째',
    body: '<p>처음엔 알람을 다섯 번씩 끄고 다시 잤다. 그런데 글을 쓰겠다고 마음먹고 나니 이상하게도 눈이 먼저 떠진다. 오늘은 알람이 울리기 전에 깼다.</p><p>아침의 고요함이 좋다. 아무도 나를 찾지 않는 한 시간. 그 시간에 어제 있었던 일을 적는다. 별것 아닌 일도 글로 옮기면 무게가 생긴다.</p><p>일주일이 지났다. 아직은 습관이라 부르기 이르지만, 적어도 도망치지는 않았다.</p>',
    contentPreview:
      '처음엔 알람을 다섯 번씩 끄고 다시 잤다. 그런데 글을 쓰겠다고 마음먹고 나니 이상하게도 눈이 먼저 떠진다. 오늘은 알람이 울리기 전에 깼다. 아침의 고요함이 좋다. 아무도 나를 찾지 않는 한 시간.',
    author: stubAuthor,
    createdAt: '2026-06-20T21:05:00.000Z',
    thumbnailImageURL: null,
    weekDaysFromFirstDay: 5,
    countOfComments: 2,
    countOfReplies: 1,
    comments: [
      {
        id: 'pv-comment-1',
        author: stubCommenter,
        body: '<p>알람 다섯 번 끄는 거 저랑 똑같아서 웃었어요. 일주일 축하해요!</p>',
        createdAt: '2026-06-20T22:10:00.000Z',
        replies: [
          {
            id: 'pv-reply-1',
            author: stubAuthor,
            body: '<p>같이 버텨봐요. 내일도 6시에 만나요 ㅎㅎ</p>',
            createdAt: '2026-06-20T22:40:00.000Z',
          },
        ],
      },
      {
        id: 'pv-comment-2',
        author: stubReplier,
        body: '<p>“글로 옮기면 무게가 생긴다”는 문장이 오래 남네요.</p>',
        createdAt: '2026-06-21T08:15:00.000Z',
        replies: [],
      },
    ],
  },
];
