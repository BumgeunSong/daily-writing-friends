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

/** Raw preview post content; comment/reply tallies are derived, not stored. */
type PreviewPostContent = Omit<PreviewPost, 'countOfComments' | 'countOfReplies'>;

export const PREVIEW_BOARD_NAME = '매일 글쓰기 프렌즈 프리뷰';

/** Deduplicated preview author identities, keyed by synthetic id. */
export const PREVIEW_AUTHORS: Record<string, PreviewAuthor> = {
  'pv-author-1': { id: 'pv-author-1', displayName: '최연수', profileImageURL: '/preview/avatars/aRBrbXOPLINVKJNa.jpg' },
  'pv-author-2': { id: 'pv-author-2', displayName: '범근', profileImageURL: '/preview/avatars/dceb8561-3ca9-43.jpg' },
  'pv-author-3': { id: 'pv-author-3', displayName: '행귤', profileImageURL: '/preview/avatars/pv-author-3.jpg' },
  'pv-author-4': { id: 'pv-author-4', displayName: '마타', profileImageURL: '/preview/avatars/pv-author-4.jpg' },
  'pv-author-5': { id: 'pv-author-5', displayName: '쿄울', profileImageURL: '/preview/avatars/pv-author-5.jpg' },
  'pv-author-6': { id: 'pv-author-6', displayName: '결심맨', profileImageURL: '/preview/avatars/OugrpATfGlYCfiOz.jpg' },
  'pv-author-7': { id: 'pv-author-7', displayName: '지지', profileImageURL: '/preview/avatars/CAhqEqZaYAh8cMjQ.jpg' },
  'pv-author-8': { id: 'pv-author-8', displayName: '희수', profileImageURL: '/preview/avatars/R6CTrjRaofh4ySEr.jpg' },
  'pv-author-9': { id: 'pv-author-9', displayName: 'N지', profileImageURL: '/preview/avatars/89kNbXuJwnbpDVjq.jpg' },
  'pv-author-10': { id: 'pv-author-10', displayName: '방랑기사', profileImageURL: '/preview/avatars/6d8d2740-5841-40.jpg' },
  'pv-author-11': { id: 'pv-author-11', displayName: '형선', profileImageURL: '/preview/avatars/pv-author-11.jpg' },
  'pv-author-12': { id: 'pv-author-12', displayName: '종이', profileImageURL: '/preview/avatars/pv-author-12.jpg' },
  'pv-author-13': { id: 'pv-author-13', displayName: '구름', profileImageURL: '/preview/avatars/34598cfa-e838-44.jpg' },
  'pv-author-14': { id: 'pv-author-14', displayName: '보람', profileImageURL: '/preview/avatars/967a836e-b06c-40.jpg' },
  'pv-author-15': { id: 'pv-author-15', displayName: 'Toby', profileImageURL: '/preview/avatars/pv-author-15.jpg' },
  'pv-author-16': { id: 'pv-author-16', displayName: '가롱', profileImageURL: '/preview/avatars/4ECERJJ6UreOkUOI.jpg' },
  'pv-author-17': { id: 'pv-author-17', displayName: '농농', profileImageURL: '/preview/avatars/8mROW2mdYjRUsYgd.jpg' },
  'pv-author-18': { id: 'pv-author-18', displayName: '태헌', profileImageURL: '/preview/avatars/pv-author-18.jpg' },
  'pv-author-19': { id: 'pv-author-19', displayName: '흑미언니', profileImageURL: '/preview/avatars/WjUzRJwPAVOj3ZsV.jpg' },
  'pv-author-20': { id: 'pv-author-20', displayName: '나미', profileImageURL: '/preview/avatars/pv-author-20.jpg' },
};

/**
 * Real member posts exported via scripts/export-preview-posts.ts (design doc §5).
 * Bodies/comment bodies are raw DB HTML; author IDs are synthetic (pv-author-*).
 * Ordered chronologically (oldest first).
 */
const PREVIEW_POST_CONTENTS: PreviewPostContent[] = [
  {
    id: 'Ntl4V3Jvtmu63A5tZQDS',
    title: '"할" 도전과 "안 할" 도전',
    body: '<p>새해에 도전해 볼지도 모르는 제일 사소한 결심으로,<strong> "할" 도전과 "안 할" 도전</strong> 두 가지가 생각났다. </p><p><br></p><p><br></p><p><strong>#10분만 일찍 일어나기</strong></p><p><br></p><p>나는 잠이 너-무 많고, 잘 때에는 너무 푹 자서 귀가 닫혀있다. </p><p>다음날 일정이 없다면 오후까지도 잘 수 있다. </p><p>가끔 주말에 오빠가 내가 너무 안 일어나서 몸이 아픈건지, 무슨 병이 있는 건 아닌지 걱정하기도 한다. </p><p><br></p><p>이런거 보면, 평일에 한번도 지각 안 하고 일어나는 게 너무 신기하고 기적이지만, </p><p>사실 내게 아침은 전쟁통이다. </p><p><br></p><p>10분컷 화장&amp;옷 입기.</p><p>경보로 지하철역가기. </p><p>초록불 계산하면서 2-3분 전부터 뛰기.</p><p><br></p><p>여유따윈 없는 내 출근길...</p><p><br></p><p>10시 미팅이면 9시 58분에 1층에 도착해서 59분에 자리에 도착해서 옷 벗고 10시 미팅에 들어간다. </p><p>후.</p><p>지각한 적은 없지만 항상 너무 아슬아슬..</p><p><br></p><p>나도 이런 내가 싫다..</p><p>같이 사는 오빠는 아침에 운동까지 하는데. </p><p><br></p><p>아침에 평화를 만들고 싶다. </p><p>10분만 일찍 일어나기. 내년에는 이걸 실천하고 싶다. </p><p><br></p><p>10분만 일찍 일어나서 여유있는 하루를 시작하고, </p><p>여유있고 그릇이 넓은 사람이 되고 싶다. </p><p><br></p><p><br></p><p><strong>#일주일에 운동 하루 안 해도 되기</strong></p><p><br></p><p>운동/몸매 강박이 있어서 매일 운동을 해야한다는 강박이 심한 편이다. </p><p><br></p><p>그렇다고 현실적으로 매일 하는 것도 아니다. </p><p><br></p><p>바빠서 운동을 못 할 때도 있구, </p><p>하기 싫어서 밍기적거릴 때도 있구, </p><p><br></p><p>근데 그런 날에는 자기전까지 \'아 운동도 안한 게으른 나.. 하 살찔거 같은데..\' 이 생각이 나를 사로잡는다. </p><p><br></p><p>내년에는 운동을 하루 정도는 <strong>"안 하는 결심"</strong>을 하고자 한다. </p><p><br></p><p>어차피 안 할 꺼 나를 옥죌 필요는 없는 거 같다. </p><p>스스로 만든 감옥과 미로에서 벗어나고 하루하루를 좀 더 즐겨야지. </p><p><br></p><p>이렇게 쓰고 보니, 나.. 내년에 여유를 좀 찾고 싶나보네.</p><p><br></p><p><strong>여:</strong>전히 늦잠자면 안 돼-</p><p><strong>유:</strong>별스럽게 운동하지 않기-</p><p><br></p><p>@결심맨님, </p><p>덕분에 제게 지금 필요한게 뭔지 알게되었네영. 왕좋은 미션 너무 캄사합니당!! </p>',
    contentPreview:
      '새해에 도전해 볼지도 모르는 제일 사소한 결심으로, "할" 도전과 "안 할" 도전 두 가지가 생각났다. #10분만 일찍 일어나기 나는 잠이 너-무 많고, 잘 때에는 너무 푹 자서 귀가 닫혀있다. 다음날 일정이 없다면 오후까지도 잘 수 있다. 가끔 주말에 오빠가 내가 너무 안 일어나서 몸이 아픈건지, 무슨 병이 있는 건 아닌지 걱정하기도 한다. 이런거',
    author: PREVIEW_AUTHORS['pv-author-9'],
    createdAt: '2025-12-26T10:06:18.185+00:00',
    thumbnailImageURL: null,
    weekDaysFromFirstDay: 9,
    comments: [
      {
        id: 'x7CuFfzwsJ549Tz8tkef',
        author: PREVIEW_AUTHORS['pv-author-16'],
        body: '운동 안 할 결심..! 신선하고 멋진 결심이네요 ㅋㅋㅋㅋㅋ viva la vida~~',
        createdAt: '2025-12-26T11:01:47.222+00:00',
        replies: [
          {
            id: 'wJJiLQTo3fSw2rO1e4LJ',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '감사합니당',
            createdAt: '2025-12-28T13:54:48.921+00:00',
          },
        ],
      },
      {
        id: 'LaGibYTuqeord03yx2y0',
        author: PREVIEW_AUTHORS['pv-author-17'],
        body: '오 ㅠㅠ 강박이 있을바에야 스트레스 없이 안할 결심도 넘 좋은것 같아요!! ',
        createdAt: '2025-12-26T11:24:28.079+00:00',
        replies: [
          {
            id: 'kpdmdZzmbKytvhq7sulM',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '마자여 \n어차피 안할꺼 내려놔야쥬ㅎㅎ',
            createdAt: '2025-12-28T13:55:01.245+00:00',
          },
        ],
      },
      {
        id: 'QoUXqa5lMOIZlogpUM3j',
        author: PREVIEW_AUTHORS['pv-author-6'],
        body: '> 지각한 적은 없지만 항상 너무 아슬아슬..\n\n진짜 이런분들 볼 때마다 신기합니다 ㅋㅋㅋㅋ 저는 쫄리는 느낌이 싫어서 무조건 여유롭게 다니거든요. ',
        createdAt: '2025-12-26T12:50:31.841+00:00',
        replies: [
          {
            id: 'NKBtJX2UP5Wt90oAmgVx',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '와우.. 대단하셔요ㄷㄷ',
            createdAt: '2025-12-28T13:55:12.592+00:00',
          },
        ],
      },
      {
        id: 'zELJdEtuWNlKjl2M97yU',
        author: PREVIEW_AUTHORS['pv-author-4'],
        body: '> 여:전히 늦잠자면 안 돼- \n> 유:별스럽게 운동하지 않기-\n마지막은 연지님답게 센스이행시로 마무리!!! ',
        createdAt: '2025-12-26T13:11:22.751+00:00',
        replies: [
          {
            id: 'GmPuL9PO0b2O3WnVjGTX',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '깔깔 감사해영',
            createdAt: '2025-12-28T13:55:20.803+00:00',
          },
        ],
      },
      {
        id: 'AdWxmbj0gChcLfNRFUaa',
        author: PREVIEW_AUTHORS['pv-author-18'],
        body: '운동을 오히려 안할 결심이라니.. ㅠㅠ 대단하십니다! ',
        createdAt: '2025-12-26T13:31:12.98+00:00',
        replies: [
          {
            id: '02SW3yyoGtK5NxsE29QX',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '오휴 안하는거똑같아유\n그저 내려놓을뿐...😅',
            createdAt: '2025-12-28T13:55:40.744+00:00',
          },
        ],
      },
      {
        id: 'WiW0lZXFZcRtrdJe61xP',
        author: PREVIEW_AUTHORS['pv-author-3'],
        body: '아니 운동을 매일같이 하는 삶을 살면서 잠은 많고 시간에 쫓겨 사는 게 공존할 수 있는지 몰랐어요 ㅋㅋㅋㅋㅋㅋ 반전매력의 사람이군요..ㅋㅋㅋ 새해에는 시간과 몸과 맘에 여유를 찾는 연지님 되시길!!',
        createdAt: '2025-12-29T03:54:34.357+00:00',
        replies: [
          {
            id: 'xETIbJ0kwlXHhy37pNww',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '하고싶은것만 열심히하는 거죠 모..ㅎㅎ\n행귤님도 좋은 일 가득하시길 바랄게요오><',
            createdAt: '2025-12-29T12:28:27.766+00:00',
          },
        ],
      },
      {
        id: 'Pqhz9PoKM2r0w74aDTyh',
        author: PREVIEW_AUTHORS['pv-author-1'],
        body: "베스트 글 목록에 올라와서 읽게 됐네요 ㅎㅎ '안 할 결심' 이라니! 좋은 것 같아요!\n그나저나 저 같이 사는 친구도 연지님처럼 항상 아슬아슬하게 출근하는데 제가 다 불안하더라고요.\n어떻게 하면 여유로워질 수 있을까요..?",
        createdAt: '2026-01-02T08:09:36.678+00:00',
        replies: [
          {
            id: 'PDXQUCPOv8uS2RoT1MNP',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '아 같이 사는 분도 저랑 비슷하군여../\n여유를 위해선 10분 일찍일어나기.. 를 실천하기로 했는데...\n오늘은 우선 실패했어여...ㅋㅋ.....ㅋㅋㅋㅋㅋ첫날부터...',
            createdAt: '2026-01-02T12:25:18.712+00:00',
          },
        ],
      },
    ],
  },
  {
    id: 'hoBdfQvdLfUDJLyV2Xc4',
    title: '질리지 않는 기본',
    body: '<p>맛있는 음식 중에 가장 맛있는 음식은 매일 먹어도 질리지 않는 음식이 아닐까요?</p><p>저는 한국인이지만 아주 양스러운 입맛인데요. 빵과 시리얼, 우유, 잼, 치즈를 매우 좋아합니다. 네덜란드에서 1년 산 적이 있는데 그 1년 동안 한식 거의 안 먹고도 별로 문제가 없었더랬죠.</p><p>그 중에서도 가장 질리지 않는 음식은 시리얼입니다. 왜나하면 매일 아침으로 먹기 때문이죠. 근 5년 간 거의 매일 시리얼로 아침을 먹습니다. (아마 커피를 제외하고 가장 많이 먹는 음식일듯..)</p><p>시리얼도 오직 ‘켈로그 현미 후레이크’만 먹습니다. 일반 콘프레이크 같은 달달한 맛을 싫어하거든요. </p><p>예전에는 켈로그 스페셜K를 먹었는데요. 현미 후레이크로 갈아탄지 한 3-4년 됐네요. 진짜 고소하고 질리지 않게 맛있습니다. 시리얼치고는 당도 낮고 성분이 괜찮은 편입니다. 굉장히 기본에 충실하달까요?</p><p>기본에 충실이라는 말이 나오니 생각났습니다. 저는 음식도 옷도 물건도 다 ’기본에 충실‘해서 질리지 않는 느낌을 좋아합니다. 옷은 유니클로, 물건은 무인양품, 빵은 식빵 좋아하고, 시리얼은 현미 후레이크 시리얼이랄까..</p><p><img src="/preview/posts/151131_IMG_5441.jpeg"></p>',
    contentPreview:
      '맛있는 음식 중에 가장 맛있는 음식은 매일 먹어도 질리지 않는 음식이 아닐까요? 저는 한국인이지만 아주 양스러운 입맛인데요. 빵과 시리얼, 우유, 잼, 치즈를 매우 좋아합니다. 네덜란드에서 1년 산 적이 있는데 그 1년 동안 한식 거의 안 먹고도 별로 문제가 없었더랬죠. 그 중에서도 가장 질리지 않는 음식은 시리얼입니다. 왜나하면 매일 아침으로 먹기',
    author: PREVIEW_AUTHORS['pv-author-2'],
    createdAt: '2026-01-12T06:12:06.025+00:00',
    thumbnailImageURL:
      '/preview/posts/151131_IMG_5441.jpeg',
    weekDaysFromFirstDay: 0,
    comments: [
      {
        id: 'tVvnWvYBggpKMrToYpbW',
        author: PREVIEW_AUTHORS['pv-author-6'],
        body: '안질리는 걸 좋아하는 스타일이 인생에 베어 있군요',
        createdAt: '2026-01-12T07:12:51.57+00:00',
        replies: [
          {
            id: 'OsjFYZr2DhrU7XDhsNMq',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '저도 오늘 쓰면서 알았네요',
            createdAt: '2026-01-13T00:05:17.144+00:00',
          },
          {
            id: 'M8KtXobf1qowCq4yk1Yt',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '효율충이라..;',
            createdAt: '2026-01-13T00:05:23.316+00:00',
          },
        ],
      },
      {
        id: 'Nw4St6QHEgzCwhvFsy5M',
        author: PREVIEW_AUTHORS['pv-author-7'],
        body: '아 현미시리얼 맛있죠..... 씹을수록 감칠맛이 올라오는 맛',
        createdAt: '2026-01-12T08:57:04.733+00:00',
        replies: [
          {
            id: '5eqzI4kuh9F3200P8hOa',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '안 부담스러운 맛 ㅎㅎ',
            createdAt: '2026-01-13T00:05:43.109+00:00',
          },
        ],
      },
      {
        id: 'ol5zfgL4wUlFwfzbKLrh',
        author: PREVIEW_AUTHORS['pv-author-8'],
        body: '오 최애음식 치고는 패키지가 상당히 실망스러운데.. 열린 마음으로 다음에 마트가서 한번 집어보겠습니다',
        createdAt: '2026-01-12T10:22:41.166+00:00',
        replies: [
          {
            id: 'b5aqX1t5tdvynF7zMLvn',
            author: PREVIEW_AUTHORS['pv-author-1'],
            body: 'ㅋㅋㅋㅋㅋ패키지 평가하시는 희수님 ㅋㅋㅋㅋ 패키지에 비해 맛은 좋더군요',
            createdAt: '2026-01-12T11:24:04.599+00:00',
          },
          {
            id: 'IM42g6u8TFaKN4YGOEwj',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '아름다울 미 아니고 맛있을 미 입니다',
            createdAt: '2026-01-13T00:05:52.805+00:00',
          },
          {
            id: 'Ywelz6S7Ai6VInSnxjBn',
            author: PREVIEW_AUTHORS['pv-author-3'],
            body: 'ㅋㅋㅋㅋ실망스러운 패키지... 열린 마음... ㅋㅋㅋ 넘 웃긴 희수님',
            createdAt: '2026-01-13T01:46:12.562+00:00',
          },
        ],
      },
      {
        id: 'Kxdom8U6WhD54Ua1ExMp',
        author: PREVIEW_AUTHORS['pv-author-1'],
        body: '단 거 안 좋아하는 사람들은 이거 꽤 좋아하더라고요. 저도 최애 시리얼!\n\n근데.. 보통 아침에 시리얼 먹으면 공복 혈당 오르지 않나여 (찬물 끼얹기)',
        createdAt: '2026-01-12T11:24:46.887+00:00',
        replies: [
          {
            id: 'FGOVSFLXyKLUXCfqlCvR',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '오르지만 다른 시리얼보다는 안 오릅니다 (단호)',
            createdAt: '2026-01-13T00:06:25.444+00:00',
          },
          {
            id: 'uWd55b5E4HzTA0s6oSIe',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '하지만 솔직히 다이어트할 때 저는 시리얼을 끊으면 금방 빠지더라고요 제가 많이 먹기도 하고',
            createdAt: '2026-01-13T00:07:09.444+00:00',
          },
          {
            id: 'M75wdDKV5511NsTe2WH5',
            author: PREVIEW_AUTHORS['pv-author-3'],
            body: 'ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ 찬물끼얹기 넘 웃겨요',
            createdAt: '2026-01-13T01:45:27.657+00:00',
          },
          {
            id: 'Gi5RAPdLG5babRGioGTt',
            author: PREVIEW_AUTHORS['pv-author-4'],
            body: 'ㅋㅋㅋㅋㅋㅋ 쿠팡카트에 넣었다가 .. 내려놓기..',
            createdAt: '2026-01-13T02:19:23.244+00:00',
          },
        ],
      },
      {
        id: '7cpL5DTivXeSZdSKGHJg',
        author: PREVIEW_AUTHORS['pv-author-5'],
        body: '공복 혈당.. 공감 되네요… 우유도 더넣고 시리얼도 추가하는 방식으로 무한대로 먹을 수 있는 시리얼 ㅜㅜ 넘 맛있죠..',
        createdAt: '2026-01-12T11:50:35.844+00:00',
        replies: [
          {
            id: 'orhAOmnw7qtzc1MNiMa5',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '시리얼 아이스크림 만들어주세요! ㅋㅋ',
            createdAt: '2026-01-13T00:07:28.235+00:00',
          },
          {
            id: '0NQbgcqncjeCTM9L1kvp',
            author: PREVIEW_AUTHORS['pv-author-1'],
            body: '와 진짜 맛있겠다',
            createdAt: '2026-01-13T07:57:31.213+00:00',
          },
          {
            id: 'CvfmIdDNzR6Fb6R863ab',
            author: PREVIEW_AUTHORS['pv-author-5'],
            body: '후후 시리얼 아이스크림 만들면 매글프에 슬쩍 남길게요 ',
            createdAt: '2026-01-13T13:21:41.776+00:00',
          },
        ],
      },
      {
        id: 'AknxZArw33FHyxOdASqJ',
        author: PREVIEW_AUTHORS['pv-author-9'],
        body: 'ㅋㅋㅋ매번 놀라운 현미후레이크 없어지는 속도..\n처음 같이 살고 너무 빨리 사라져서 놀랐....',
        createdAt: '2026-01-13T00:00:13.262+00:00',
        replies: [
          {
            id: 'xLpNEnGFMBY5ZqUjuIVC',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '그릭요거트보다는 느려요..',
            createdAt: '2026-01-13T00:07:40.062+00:00',
          },
          {
            id: 'M3uAv6LeuNIsH7O2LDUN',
            author: PREVIEW_AUTHORS['pv-author-1'],
            body: '범근님네에 우유가 항상 있어야 하는 이유가 시리얼 때문이었군요',
            createdAt: '2026-01-13T07:57:56.933+00:00',
          },
        ],
      },
      {
        id: 'utm58DkzgaJTDV6fQ7ML',
        author: PREVIEW_AUTHORS['pv-author-4'],
        body: '오 처음에는 스페셜K 먹고 이게 무슨 맛이야(negative) 였는데 고소하고 담백해서 중독되는 맛이 있더라구요.. 현미도 츄라이 해봐야겠다 ',
        createdAt: '2026-01-13T02:18:57.402+00:00',
        replies: [],
      },
    ],
  },
  {
    id: '3f5af82d-53c1-4d27-9692-03dc993497b4',
    title: '상대방이 변화하도록 돕는 대화 프레임워크',
    body: '<p>저는&nbsp;코칭에&nbsp;관심을&nbsp;갖고&nbsp;배운&nbsp;적이&nbsp;있는데요.&nbsp;나름&nbsp;별거&nbsp;아닌&nbsp;자격증도&nbsp;갖고&nbsp;있습니다.&nbsp;</p><p></p><p>코칭이&nbsp;뭐냐?&nbsp;쉽게&nbsp;설명하면&nbsp;상대방을&nbsp;좋은&nbsp;방향으로&nbsp;&#39;변화&#39;시키기&nbsp;위한&nbsp;대화의&nbsp;기술입니다.&nbsp;</p><p></p><p>우리가&nbsp;하는&nbsp;보통&nbsp;대화는&nbsp;&#39;공감&#39;이나&nbsp;&#39;일&#39;을&nbsp;목표로&nbsp;합니다.&nbsp;평소&nbsp;우리는&nbsp;대화를&nbsp;그렇게&nbsp;구조적인&nbsp;흐름으로&nbsp;하지는&nbsp;않죠.</p><p>&nbsp;</p><p>하지만&nbsp;코칭은&nbsp;&#39;상대방의&nbsp;변화&#39;를&nbsp;이끌어내는&nbsp;대화이기&nbsp;때문에&nbsp;조금&nbsp;다른데요.&nbsp;나름의&nbsp;구조가&nbsp;있습니다.&nbsp;</p><p></p><p>특히나&nbsp;이&nbsp;분야는&nbsp;영미&nbsp;심리학자들이&nbsp;많이&nbsp;발전시켜놓은&nbsp;분야라&nbsp;OARS니&nbsp;DSA니&nbsp;CBT니&nbsp;뭐&nbsp;알파벳&nbsp;줄임말이&nbsp;많습니다.&nbsp;오늘은&nbsp;그&nbsp;중에서&nbsp;제가&nbsp;코칭&nbsp;자격증&nbsp;준비할&nbsp;때&nbsp;가장&nbsp;많이&nbsp;써먹었던&nbsp;프레임워크를&nbsp;공유해봅니다.</p><p></p><p>바로&nbsp;GROW&nbsp;라는&nbsp;건데요.&nbsp;Goal&nbsp;&gt;&nbsp;Reality&nbsp;&gt;&nbsp;Options&nbsp;&gt;&nbsp;Will&nbsp;순서로&nbsp;대화를&nbsp;하라는&nbsp;거예요.&nbsp;&nbsp;상대방이&nbsp;스스로&nbsp;변화할&nbsp;수&nbsp;있게끔&nbsp;도와주는&nbsp;대화&nbsp;구조입니다.&nbsp;</p><p></p><p>이건&nbsp;꼭&nbsp;굳이&nbsp;코칭이&nbsp;아니라,&nbsp;정말로&nbsp;내가&nbsp;상대방이&nbsp;좋은&nbsp;방향으로&nbsp;변화하기를&nbsp;바라는&nbsp;마음이&nbsp;있고,&nbsp;고민&nbsp;상담을&nbsp;하고&nbsp;있다라고&nbsp;하면&nbsp;언제든지&nbsp;써먹을&nbsp;수&nbsp;있는&nbsp;방법입니다.&nbsp;</p><p>사실&nbsp;나&nbsp;스스로에게&nbsp;쓸&nbsp;수도&nbsp;있어요.&nbsp;내가&nbsp;뭔가&nbsp;막힌&nbsp;문제가&nbsp;있고&nbsp;고민이&nbsp;있을&nbsp;때&nbsp;스스로&nbsp;G-R-O-W&nbsp;방식으로&nbsp;글을&nbsp;써보면&nbsp;도움이&nbsp;됩니다.</p><p></p><p>아무튼&nbsp;GROW&nbsp;모델로&nbsp;하면&nbsp;대화의&nbsp;흐름을&nbsp;이렇게&nbsp;가져가게&nbsp;됩니다.</p><p></p><p>(시작&nbsp;&amp;&nbsp;라포&nbsp;형성)</p><ul><li>요즘&nbsp;어떤&nbsp;생각을&nbsp;많이&nbsp;하세요?</li><li>지금&nbsp;기분이&nbsp;좀&nbsp;어떠세요?</li><li>오늘&nbsp;얘기해보고&nbsp;싶으신게&nbsp;있었나요?</li><li>(프리스타일&nbsp;인트로)</li></ul><p></p><h2>Goal&nbsp;-&nbsp;막연한&nbsp;고민을&nbsp;구체적인&nbsp;목표로&nbsp;만들기</h2><ul><li>지금&nbsp;고민하고&nbsp;있는&nbsp;그&nbsp;문제와&nbsp;관련해서,&nbsp;결과적으로&nbsp;00님이&nbsp;바라는&nbsp;결과는&nbsp;뭐예요?</li><li>그&nbsp;문제가&nbsp;해결되면&nbsp;어떤&nbsp;모습이&nbsp;되길&nbsp;바라시나요?</li><li>만약&nbsp;00&nbsp;제약이&nbsp;없다면&nbsp;무엇을&nbsp;하고&nbsp;싶으세요?</li><li>00님이&nbsp;진짜&nbsp;원하는&nbsp;건&nbsp;뭐예요?&nbsp;</li><li>00&nbsp;님이&nbsp;풀어야할&nbsp;진짜&nbsp;문제는&nbsp;무엇일까요?</li><li>혹시&nbsp;또&nbsp;다른&nbsp;건&nbsp;없을까요?</li></ul><p></p><p>사실상&nbsp;GROW&nbsp;중에서&nbsp;가장&nbsp;중요한&nbsp;단계입니다.&nbsp;대부분의&nbsp;사람들은&nbsp;머릿속에&nbsp;막연한&nbsp;고민을&nbsp;가지고&nbsp;있어요.&nbsp;하지만&nbsp;진짜로&nbsp;내가&nbsp;뭘&nbsp;원하는지는&nbsp;생각보다&nbsp;잘&nbsp;구체화되어있지&nbsp;않습니다.&nbsp;</p><p></p><p>&quot;오늘&nbsp;회의&nbsp;시간에&nbsp;내가&nbsp;말하는데&nbsp;옆&nbsp;사람이&nbsp;슬랙을&nbsp;하고&nbsp;있어서&nbsp;거슬렸어요.&nbsp;그&nbsp;사람은&nbsp;맨날&nbsp;비협조적이에요&quot;&nbsp;라고&nbsp;했습니다.&nbsp;그렇다면&nbsp;그&nbsp;이슈를&nbsp;같이&nbsp;파헤치는&nbsp;게&nbsp;중요한&nbsp;게&nbsp;아니라,&nbsp;그래서&nbsp;말한&nbsp;사람이&nbsp;&#39;원하는&nbsp;것&#39;이&nbsp;무엇인지를&nbsp;드러내야&nbsp;합니다.&nbsp;&#39;그렇다면&nbsp;회의&nbsp;시간이&nbsp;어떻게&nbsp;되었으면&nbsp;좋겠어요?&#39;&nbsp;&#39;어떤&nbsp;문제를&nbsp;풀고&nbsp;싶으세요?&#39;&nbsp;&#39;어떤&nbsp;모습이&nbsp;되면&nbsp;좋을까요?&#39;&nbsp;이런&nbsp;질문이&nbsp;효과적이에요.&nbsp;</p><p></p><p>Goal&nbsp;단계를&nbsp;잘&nbsp;해내면,&nbsp;사람들은&nbsp;자기가&nbsp;진짜&nbsp;원했던&nbsp;것에&nbsp;대해서&nbsp;조금씩&nbsp;더&nbsp;깊게&nbsp;들어가면서&nbsp;정의하기&nbsp;시작합니다.&nbsp;예를&nbsp;들어&nbsp;처음의&nbsp;문제&nbsp;의식은&nbsp;&#39;슬랙&nbsp;하는&nbsp;사람&nbsp;짜증나서&nbsp;보기&nbsp;싫음&#39;&nbsp;이지만&nbsp;점점&nbsp;더&nbsp;&#39;회의할&nbsp;때&nbsp;다들&nbsp;적극적으로&nbsp;참여했으면&nbsp;좋겠음&#39;&nbsp;-&gt;&nbsp;&#39;모든&nbsp;사람이&nbsp;업무에&nbsp;대해서&nbsp;싱크가&nbsp;잘&nbsp;되었으면&nbsp;좋겠음&#39;&nbsp;&gt;&nbsp;모두가&nbsp;적극적으로&nbsp;달려들어서&nbsp;이번&nbsp;분기&nbsp;목표&nbsp;달성을&nbsp;했으면&nbsp;좋겠음&nbsp;이런&nbsp;식으로&nbsp;원하는&nbsp;바가&nbsp;구체화될&nbsp;수&nbsp;있는&nbsp;것이지요.&nbsp;문제&nbsp;정의가&nbsp;잘못&nbsp;잡히면&nbsp;변화가&nbsp;일어나지&nbsp;않습니다.</p><p></p><h2>Reality&nbsp;-&nbsp;현실&nbsp;인식을&nbsp;높이는&nbsp;단계</h2><ul><li>XX&nbsp;목표를&nbsp;향해서&nbsp;지금까지&nbsp;해온&nbsp;것은&nbsp;무엇이&nbsp;있나요?</li><li>목표와&nbsp;관련해서&nbsp;지금은&nbsp;어떤&nbsp;상태예요?</li><li>목표와&nbsp;관련해서&nbsp;장애물이나&nbsp;어려움은&nbsp;어떤&nbsp;게&nbsp;있었나요?</li><li>이전에는&nbsp;비슷한&nbsp;문제가&nbsp;없었나요?&nbsp;그때는&nbsp;어떻게&nbsp;했었나요?</li><li>그렇다면&nbsp;00님이&nbsp;풀어야할&nbsp;가장&nbsp;중요한&nbsp;문제는&nbsp;무엇일까요?</li></ul><p></p><p></p><p>현재&nbsp;상황을&nbsp;객관적으로&nbsp;보도록&nbsp;하는&nbsp;질문입니다.&nbsp;생각보다&nbsp;우리는&nbsp;진짜&nbsp;현실이&nbsp;아니라&nbsp;대부분&nbsp;&#39;해석&#39;을&nbsp;통한&nbsp;막연한&nbsp;느낌으로&nbsp;결정해요.&nbsp;그래서&nbsp;여기서&nbsp;최대한&nbsp;해석을&nbsp;빼고,&nbsp;현실에서&nbsp;있었던&nbsp;일이나&nbsp;시도해봤던&nbsp;것들,&nbsp;말하지&nbsp;않았던&nbsp;맥락&nbsp;등을&nbsp;꺼내도록&nbsp;유발합니다.&nbsp;무엇이&nbsp;어려움이라고&nbsp;말하면&nbsp;그게&nbsp;왜&nbsp;어려움이라고&nbsp;느끼는지도&nbsp;물어봅니다.</p><p>또한&nbsp;제&nbsp;경험상&nbsp;이&nbsp;단계에서는&nbsp;그&nbsp;사람이&nbsp;해왔던&nbsp;노력과&nbsp;긍정적인&nbsp;면을&nbsp;&#39;인정&#39;해주는&nbsp;것도&nbsp;중요해요.&nbsp;보통&nbsp;사람은&nbsp;자기가&nbsp;잘한&nbsp;것이나&nbsp;극복해온&nbsp;것은&nbsp;과소평가하고&nbsp;눈앞에&nbsp;닥친&nbsp;문제는&nbsp;과대평가하는&nbsp;경향이&nbsp;있더라고요.</p><p>현실을&nbsp;파악하다보면,&nbsp;앞에서&nbsp;나왔던&nbsp;문제를&nbsp;다시&nbsp;정의하기도&nbsp;합니다.&nbsp;&#39;지금&nbsp;상태를&nbsp;다시&nbsp;짚어보니&nbsp;진짜&nbsp;풀어야할&nbsp;문제는&nbsp;이거네?&#39;&nbsp;이런&nbsp;상태가&nbsp;될&nbsp;수&nbsp;있기&nbsp;때문에&nbsp;다시&nbsp;한번&nbsp;문제를&nbsp;정의하도록&nbsp;유도합니다.&nbsp;목표와&nbsp;현실&nbsp;사이의&nbsp;Gap이&nbsp;문제&nbsp;정의의&nbsp;공간이니까요.</p><p></p><h2>Option&nbsp;-&nbsp;선택지를&nbsp;펼치는&nbsp;단계</h2><ul><li>00를&nbsp;해결하기&nbsp;위해서,&nbsp;할&nbsp;수&nbsp;있는&nbsp;것은&nbsp;무엇이&nbsp;있을까요?</li><li>00가&nbsp;어렵다면,&nbsp;내가&nbsp;할&nbsp;수&nbsp;있는&nbsp;다른&nbsp;대안도&nbsp;있을까요?</li><li>혹시&nbsp;그&nbsp;외에는&nbsp;무엇을&nbsp;할&nbsp;수&nbsp;있을까요?\u0001\u0013</li><li>만약에&nbsp;이미&nbsp;자신이&nbsp;답을&nbsp;알고&nbsp;있다면,&nbsp;그&nbsp;답은&nbsp;무엇일&nbsp;것&nbsp;같으세요?</li><li>주변에&nbsp;친구&nbsp;중에서&nbsp;이런&nbsp;비슷한&nbsp;고민을&nbsp;하는&nbsp;친구가&nbsp;있었나요?&nbsp;그&nbsp;친구가&nbsp;당신과&nbsp;똑같은&nbsp;고민을&nbsp;한다면&nbsp;어떤&nbsp;말을&nbsp;하고&nbsp;싶으신가요?</li><li>만일&nbsp;내가&nbsp;돈/시간이&nbsp;정말&nbsp;많다면&nbsp;어떻게&nbsp;할&nbsp;수&nbsp;있을까요?</li></ul><p></p><p></p><p>사실&nbsp;사람은&nbsp;다&nbsp;해결책을&nbsp;갖고&nbsp;있습니다.&nbsp;그게&nbsp;막연하게&nbsp;마음속&nbsp;어딘가에&nbsp;언어화되어있는&nbsp;상태로&nbsp;둥둥&nbsp;떠다녀서&nbsp;끌어내지&nbsp;못할&nbsp;뿐이죠.&nbsp;앞에서&nbsp;우리는&nbsp;내가&nbsp;원하는&nbsp;목표와,&nbsp;현실에&nbsp;대해&nbsp;여러가지&nbsp;탐색을&nbsp;했습니다.&nbsp;</p><p>이쯤&nbsp;되면&nbsp;스스로&nbsp;말을&nbsp;하면서&nbsp;메타인지가&nbsp;올라온&nbsp;상황입니다.&nbsp;이제는&nbsp;해결책으로&nbsp;생각을&nbsp;옮겨봅니다.&nbsp;판단을&nbsp;최대한&nbsp;덜어내고&nbsp;해결가능한&nbsp;경로와&nbsp;액션을&nbsp;생각해보도록&nbsp;하는&nbsp;질문을&nbsp;합니다.&nbsp;</p><p>옵션들이&nbsp;많이&nbsp;나오면,&nbsp;그&nbsp;중에&nbsp;어떤&nbsp;것이&nbsp;가장&nbsp;괜찮고&nbsp;지금&nbsp;해볼&nbsp;수&nbsp;있을&nbsp;것인지를&nbsp;골라보게&nbsp;합니다.&nbsp;그런&nbsp;다음&nbsp;실행으로&nbsp;갑니다.</p><p></p><p></p><h2>Will&nbsp;-&nbsp;실행과&nbsp;의지</h2><ul><li>그&nbsp;액션을&nbsp;언제&nbsp;시작하실&nbsp;건가요?</li><li>그&nbsp;행동을&nbsp;하기&nbsp;위해서&nbsp;필요한&nbsp;환경&nbsp;설정이나&nbsp;도움이&nbsp;있을까요?</li><li>내가&nbsp;실행했다는&nbsp;것을&nbsp;어떻게&nbsp;인증할&nbsp;수&nbsp;있을까요?</li><li>그&nbsp;행동에&nbsp;대한&nbsp;현재&nbsp;실행&nbsp;의지는&nbsp;어느&nbsp;정도인&nbsp;것&nbsp;같으세요?&nbsp;1-10점</li><li>어떻게&nbsp;하면&nbsp;10점이&nbsp;될&nbsp;수&nbsp;있을까요?</li><li>00을&nbsp;언제까지&nbsp;하겠다라는&nbsp;걸&nbsp;정해서&nbsp;저한테&nbsp;메시지로&nbsp;보내주실래요?</li></ul><p></p><p>목표&nbsp;-&nbsp;현실&nbsp;-&nbsp;해결책을&nbsp;&#39;생각&#39;하는&nbsp;것만으로는&nbsp;변화가&nbsp;일어나지&nbsp;않습니다.&nbsp;결국&nbsp;액션을&nbsp;실행해야&nbsp;하는데요.&nbsp;그래서&nbsp;코칭을&nbsp;할&nbsp;때는&nbsp;이&nbsp;사람이&nbsp;정말&nbsp;말만&nbsp;아니라&nbsp;행동을&nbsp;하게끔&nbsp;돕는&nbsp;마지막&nbsp;단계도&nbsp;굉장히&nbsp;중요합니다.&nbsp;</p><p>그냥&nbsp;해야겠다,&nbsp;하면&nbsp;좋겠다의&nbsp;수준이&nbsp;아닌지&nbsp;체크해야합니다.&nbsp;의지나&nbsp;환경이&nbsp;충분해보이지&nbsp;않는다면&nbsp;행동을&nbsp;더&nbsp;구체화하거나&nbsp;작게&nbsp;만들어서&nbsp;그&nbsp;사람이&nbsp;작게나마&nbsp;행동을&nbsp;하게&nbsp;합니다.&nbsp;나랑&nbsp;대화가&nbsp;끝났을&nbsp;때&nbsp;&#39;아&nbsp;이거는&nbsp;꼭&nbsp;다음까지&nbsp;해보고&nbsp;오겠다&#39;라는&nbsp;게&nbsp;머릿속에&nbsp;(혹은&nbsp;기록으로)&nbsp;남는&nbsp;게&nbsp;베스트입니다.</p><p>다음에&nbsp;follow-up을&nbsp;하게&nbsp;되면&nbsp;그&nbsp;행동을&nbsp;했는지&nbsp;물어보고&nbsp;했다면&nbsp;칭찬과&nbsp;인정을&nbsp;해줍니다.</p><p></p><p>---</p><p>코칭&nbsp;자격증&nbsp;시험을&nbsp;보게&nbsp;되면&nbsp;위의&nbsp;과정을&nbsp;거의&nbsp;15분&nbsp;안에&nbsp;슈루룩&nbsp;진행해나가는&nbsp;시연을&nbsp;해야하는데요.&nbsp;사실&nbsp;뭐&nbsp;이&nbsp;구조를&nbsp;지켜야하고&nbsp;15분&nbsp;해야하고&nbsp;그게&nbsp;중요한&nbsp;건&nbsp;아닙니다.&nbsp;</p><p>누구나&nbsp;고민상담을&nbsp;하는&nbsp;순간들이&nbsp;있잖아요?&nbsp;물론&nbsp;단순히&nbsp;수다를&nbsp;떨고&nbsp;서로&nbsp;라포를&nbsp;쌓고&nbsp;잼얘를&nbsp;하는&nbsp;게&nbsp;목적인&nbsp;고민상담도&nbsp;있고&nbsp;그럴&nbsp;땐&nbsp;그냥&nbsp;프리스타일로&nbsp;해도&nbsp;됩니다.</p><p>하지만&nbsp;어떤&nbsp;사람이&nbsp;더&nbsp;나아지도록&nbsp;변화하는&nbsp;걸&nbsp;돕고&nbsp;싶다면&nbsp;GROW가&nbsp;큰&nbsp;도움이&nbsp;됩니다.&nbsp;어떤&nbsp;요소를&nbsp;짚어야하고&nbsp;질문해야하고&nbsp;주의깊게&nbsp;들어주어야&nbsp;하는지&nbsp;감각이&nbsp;좀&nbsp;생기는&nbsp;거죠.</p><p>별&nbsp;의식을&nbsp;안하고&nbsp;대화를&nbsp;하다가도,&nbsp;어&nbsp;이&nbsp;사람이&nbsp;지금&nbsp;Goal이&nbsp;명확하지&nbsp;않네?&nbsp;이&nbsp;사람이&nbsp;지금&nbsp;현실에&nbsp;대해서&nbsp;얘기를&nbsp;하지&nbsp;않네?&nbsp;하는&nbsp;느낌이&nbsp;들고,&nbsp;이런&nbsp;질문을&nbsp;해봐야겠다&nbsp;생각이&nbsp;든다면...&nbsp;당신은&nbsp;벌써&nbsp;코칭의&nbsp;고수!</p>',
    contentPreview:
      "저는 코칭에 관심을 갖고 배운 적이 있는데요. 나름 별거 아닌 자격증도 갖고 있습니다. 코칭이 뭐냐? 쉽게 설명하면 상대방을 좋은 방향으로 '변화'시키기 위한 대화의 기술입니다. 우리가 하는 보통 대화는 '공감'이나 '일'을 목표로 합니다. 평소 우리는 대화를 그렇게 구조적인 흐름으로 하지는 않죠. 하지만 코칭은 '상대방의 변화'를 이끌어내는 대화이기",
    author: PREVIEW_AUTHORS['pv-author-2'],
    createdAt: '2026-04-17T13:41:25.287+00:00',
    thumbnailImageURL: null,
    weekDaysFromFirstDay: null,
    comments: [
      {
        id: 'cd766047-65da-49c3-99b2-9e5d3d5ad79b',
        author: PREVIEW_AUTHORS['pv-author-6'],
        body: '리스펙',
        createdAt: '2026-04-17T14:34:34.707+00:00',
        replies: [],
      },
      {
        id: 'f2aebd4b-fddd-40ae-922d-f3341587811f',
        author: PREVIEW_AUTHORS['pv-author-15'],
        body: '코칭 너무 어려워요..',
        createdAt: '2026-04-17T15:15:57.14+00:00',
        replies: [],
      },
      {
        id: '760dda84-bef5-4544-8d06-a305b6c0e657',
        author: PREVIEW_AUTHORS['pv-author-3'],
        body: '와우.. 코칭이라니 뭔가 다정한 T의 대화 같아서, 내담자가 울다가 눈물 닦고 갑자기 OKR부터 미래계획 착착 잘 세워갈 것 같아요ㅋㅋㅋㅋㅋㅋ',
        createdAt: '2026-04-19T11:01:56.376+00:00',
        replies: [],
      },
      {
        id: '11e944d3-c4ae-4d6f-b562-27abce21aa64',
        author: PREVIEW_AUTHORS['pv-author-4'],
        body: '범근님이 할 때는 착착 언어화 안되었던 생각들이 술술 나오는데 .. 따라하다보면 같은 질문인데 답이 안나오는 거 같고 ㅜ 이해와 실전은 또 다르네요!! 한번 더 읽어보고 갑니다 ',
        createdAt: '2026-04-20T00:34:22.591+00:00',
        replies: [],
      },
      {
        id: 'a6817cef-38f2-4c09-b89a-54c74eb1cf3e',
        author: PREVIEW_AUTHORS['pv-author-11'],
        body: '크 이거 궁금했는데!',
        createdAt: '2026-04-23T22:42:16.846+00:00',
        replies: [],
      },
    ],
  },
  {
    id: '17e4a8d1-ee3e-42ef-8464-72295f1741d5',
    title: '"You just need someone to be brave for."',
    body: "<ul><li><p>'프로젝트 헤일메리'를 보고 왔습니다. 정말 오랜만에 영화관에 갔는데요. 오후 휴가를 내고 가족 독서모임에 가는 길에 시간이 좀 남았습니다. 마침 오늘 동생이 독서모임에서 발표하는 주제가 헤일메리라길래, 그럼 한번 보고 갈까? 해서 혼자 영화관에 갔습니다. 오전 1시의 조용한 영화관과 아이맥스의 몰입감이 정말 좋았고, 무엇보다 역시 프로젝트 헤일메리는 기대한만큼 재미있었습니다. (저는 원래 소설의 팬입니다.) 극장에서 보는 게 이런 맛이구나 새삼 다시 느꼈습니다.</p></li><li><p>영화를 보고나서 특히 여운이 오래 남았던 대화를 하나 얘기해보려 합니다.</p></li></ul><p></p><p>-- (스포주의) --</p><p></p><ul><li><p>이 영화는 '과학 미스터리' '우주 어드벤쳐' '외계인과의 우정'도 있지만요. 이번에 저에게 가장 눈에 띄었던 주제는 '용기(brave)'였습니다.</p></li><li><p>주인공인 그레이스는 초반에 정말 용기가 없는 사람입니다. 그는 항상 도망쳐왔죠. 학계에서 비주류 의견을 내다가 퇴출당했지만, 사실 자기가 도망친 겁니다. 본인을 루저, 멍청이라고 자주 표현하는데 자기 스스로도 그걸 알고 있기 때문이죠. 그는 세상을 구한 임무에 참여하면서도 계속해서 중요한 순간에 용기를 내지 못한다.</p></li><li><p>그레이스는 죽을 각오를 하고 헤일메리 미션을 받는 조종사 야오에게 이렇게 말한다.</p></li><li><p>\"저라면 정말 못했을 거예요. 정말 용기를 타고 나셨네요.\"</p></li><li><p>야오는 태연하게 이렇게 대답합니다. 그리고 반드시 죽게 되는 미션을 진행하러 유유히 걸어가죠.</p></li></ul><p></p><blockquote><p><em>Anyone can be brave. You just need someone to be brave for</em>.</p></blockquote><p></p><p></p><ul><li><p>용기는 타고나는 것이 아니다. 그저 내가 용감해져야할 이유가 되는 '누군가'가 있기 때문이라는 거죠.</p></li><li><p>'용감해져야하는 누군가'가 누굴까? 결국 소중한 사람, '가족'이 떠오릅니다.</p></li><li><p>그레이스는 가족이 없습니다. 용감해져야할 누군가가 없습니다.</p></li><li><p>결국 모험 중에 가족 같은 '록키'를 만나게 됩니다. (심지어 '록키'는 그가 학계에서 퇴출당하게 만든 이론의 증명체이기도 합니다.)</p></li><li><p>그와의 관계를 통해서 정말로 용감한 행동들을 하게 됩니다. 록키에게 '너는 정말 용감해'라는 말을 듣게 되죠. 마지막 영화 결말은 정말 그레이스가 '용감해져야하하는 누군가'를 갖고 나면 얼마나 용감해질 수 있는지를 보여줍니다.</p></li></ul><p></p><ul><li><p>저는 영화를 보고 나오면서 그런 생각이 들었습니다. 나에게는 '용기를 내야하는 누군가'가 있을까? 역시나 그건 아내와 부모님, 가족인 거 같습니다. 내가 갑자기 제 3세계 범죄 소굴에 들어가야한다고 하면 절대 그런 용기가 나지 않겠지만, 거기에 아내나 가족이 갇혀있다고 하면 무조건 가게 될 거 같거든요.</p></li><li><p>예전에는 저는 세상의 많은 잘못된 일이나 악순환이 '무지'에서 비롯된다고 생각했었는데요. 요즘에는 '용기'가 없기 때문이라는 생각을 합니다.</p></li><li><p>사실 답은 꽤 클리어한 경우가 많습니다. 클리어하다는 게 쉽다는 얘기는 전혀 아니죠. 정답이 클리어한데도 쉽지 않은 이유. 대부분 그 정답이 항상 상당한 '용기'를 요구하기 때문입니다. 지식보다 용기가 훨씬 희소한 것 같아요.</p></li><li><p>지금 내가 있는 곳을 바꿔야할 용기, 내가 믿고 있는 것을 의심해야할 용기, 남들에게 인정받는 것을 포기해야할 용기 등.</p></li><li><p>하지만 어떤 사람들은 그런 용기있는 행동을 실제로 하죠. 그런데 그러기 위해선 내가 특별히 타고난 용감한 사람이 될 필요가 있거나, 슈퍼 히어로의 능력을 타고나야하는 게 아니라, 그 용기를 내야할 이유가 필요하다는 것. 이게 꽤나 인상적으로 머리에 박혔습니다.</p></li><li><p>저는 예전에 가족이 생기면 내가 더 용기있는 행동, 도전을 못하게 되는 거라고 생각했는데요. 오히려 지금은, 가족이 생겼기에 더 용기있을 수 있다는 생각도 듭니다. 어차피 정해진 이유도 없는 이 세상에 결국 '소중한 누군가'는 내가 용기를 낼 수 있게 만들어주는 가장 중요한 이유이니까요.</p></li><li><p>마침 오늘 가족에 대해 쓰는 날이라고 하니, 더 저 대사가 와닿았네요.</p></li><li><p>여러분은 'someone to be brave for' 가 있으신가요?</p></li></ul><p></p>",
    contentPreview:
      "'프로젝트 헤일메리'를 보고 왔습니다. 정말 오랜만에 영화관에 갔는데요. 오후 휴가를 내고 가족 독서모임에 가는 길에 시간이 좀 남았습니다. 마침 오늘 동생이 독서모임에서 발표하는 주제가 헤일메리라길래, 그럼 한번 보고 갈까? 해서 혼자 영화관에 갔습니다. 오전 1시의 조용한 영화관과 아이맥스의 몰입감이 정말 좋았고, 무엇보다 역시 프로젝트 헤일메리는",
    author: PREVIEW_AUTHORS['pv-author-2'],
    createdAt: '2026-05-08T14:49:37.832+00:00',
    thumbnailImageURL: null,
    weekDaysFromFirstDay: null,
    comments: [
      {
        id: 'a809d63d-2bf2-412e-ace4-154ea0b86e31',
        author: PREVIEW_AUTHORS['pv-author-6'],
        body: '완전 공감. 감탄문.',
        createdAt: '2026-05-08T23:50:58.642+00:00',
        replies: [],
      },
      {
        id: '17f0332b-7fae-4d12-9408-94290d7b457a',
        author: PREVIEW_AUTHORS['pv-author-3'],
        body: '이 글 amaze amaze amaze\n\n> 저는 예전에 가족이 생기면 내가 더 용기있는 행동, 도전을 못하게 되는 거라고 생각했는데요. 오히려 지금은, 가족이 생겼기에 더 용기있을 수 있다는 생각도 듭니다.\n\n우왁… 감탄하면서 읽었어요… 용기에 대하여 뜬구름 잡는 이야기가 아니라 와닿아서 더 용기가 나는 글이네요…!!! ',
        createdAt: '2026-05-09T00:07:13.424+00:00',
        replies: [],
      },
      {
        id: 'abc5737c-57ce-4751-8d67-938e9a53ac98',
        author: PREVIEW_AUTHORS['pv-author-14'],
        body: "저도 가진 게 많을수록 잃을 게 많아 겁쟁이가 될 것 같았는데 범근 님 글을 읽고 다시 생각하게 되네요!\n'용기'까진 아니지만 생각해 보니 내 가족에게 더 좋은 사람이 되고 싶어서 늘 애쓰는 것 같아요.\n\n그나저나 가족 독서모임이라니... 멋있다...!",
        createdAt: '2026-05-09T04:42:39.242+00:00',
        replies: [],
      },
    ],
  },
  {
    id: 'f675d197-9bf3-489a-947e-33ef6f2b6721',
    title: '내게 꼭 필요한 3가지',
    body: '<p>나를 돌본다는 건, 결국 나의 상태를 안정적으로 만드는 일인 것 같다.<br>기분이 너무 아래로 꺼지지 않게, 스트레스가 너무 오래 고여 있지 않게, 내 마음의 컨디션을 다시 stable 하게 맞추는 일.</p><p>스트레스를 풀거나, 우울한 감정을 털어내거나, 힘든 생각에서 잠시 벗어나는 방법은 사람마다 다르고, <br>나의 감정이 바로바로 좋아지는 도파민 재료들을 생각해보자면...</p><p>나의 감정에 즉각적으로 영향을 주는 건 크게 세 가지다.</p><ul><li><p>나는 예쁜 옷을 입는 걸 좋아한다.</p></li><li><p>나는 살찌는 걸 싫어한다. 사실 약간 공포가 있다.</p></li><li><p>그리고 나는 수다 떠는 걸 좋아한다.</p></li></ul><p></p><p><strong>#집에서 패션쇼</strong></p><p>어렸을 때부터 엄마가 나를 예쁘게 입히는 걸 좋아했다.<br>그래서인지 나 역시 예쁜 옷을 입는 게 너무 좋다.</p><p>예쁜 옷을 입는 것만으로도 기분이 순간 좋아지고, 에너지가 올라간다.<br>그날 입은 옷이 그날의 감정과 무드, 태도를 결정한다. 심지어 어떤 순간을 떠올릴 때도 나는 그날 입은 옷으로 기억한다.</p><p></p><p>오빠: “연지야, 벚꽃 보러 갔던 그 공원 있잖아.”</p><p>나: “아 웅웅, 나 그때 검정 트위드에 회색 치마 입었잖아.”</p><p>오빠: “ㅋㅋ 응응, 다 옷으로 생각하네.”</p><p></p><p>새로운 옷을 사면 머릿속으로 시뮬레이션을 돌리는 것도 너무 재밌다.<br>이 옷은 어디에 입고 가지? 어떤 가방이랑 들지? 신발은 뭐 신지?<br>머릿속으로 한참 조합하다 보면 빨리 집에 가서 입어보고 싶어진다.</p><p></p><p>기분이 안 좋다?<br>-&gt; 그럼 바로 집에서 패션쇼를 한다.<br>-&gt; 이 옷 저 옷 입어보고, 마음에 드는 조합을 찾고, 이 옷을 입고 갈 날을 정한다.<br>-&gt; 그러면 그날이 기다려진다.<br></p><p>무언가를 기다린다는 설렘은 하루하루를 조금 더 알차게 보내게 만든다.</p><p></p><p><strong>#땀 빼는게 최고야</strong></p><p>그리고 나는 약간의 몸매 강박이 있다. </p><p>옷은 "입었을 때의 태"도 중요하고,  내가 산 옷들을 살이 쪄서 못 입게 되면 또 새로 사야 하니까, 돈도 많이 들 거 같다 (욕심이 많으니)</p><p>그래서 살찌는 게 무섭고, 연결하여 땀이 나는 느낌을 좋아한다.</p><p></p><p>그래서 오래 유산소하는 걸 좋아한다. 러닝, 등산, 오래 걷기.<br>찜질방도 너무 좋다. 땀이 쫙 빠지는 그 느낌이 좋다.</p><p></p><p>화가 나는 날이다?<br>바로 러닝을 한다.</p><p>러닝을 하면 신기하게 모든 생각이 사라진다.<br>머릿속에서 계속 맴돌던 화나는 말, 억울한 장면, 해야 할 일들이 뛰는 동안에는 잠시 흐려진다.</p><p>그리고 속으로 생각한다.</p><p>1km만 더 뛰면,<br>30초만 더 빨리 뛰면,<br>어제 먹은 그 빵이 사라져!!!</p><p></p><p>그렇게 뛰다 보면 괜히 자기 효능감이 올라온다.<br>내 자신, 꽤 뿌듯해진다.</p><p>나가기 전에는 너무 귀찮취만-<br>하고 난 뒤에 가장 확실한 기쁨을 주는 게 또 땀 빼는 일이다.</p><p>결국 땀을 빼는 건 몸도 관리하지만, 마음도 같이 관리하는 일이다.</p><p></p><p><strong>#수다가 최고야</strong></p><p></p><p>나는 편한 사람들이랑 수다 떠는 걸 좋아한다.<br>매일 오빠한테 주문을 한다: “잼얘해줘…”</p><p></p><p>정신없고 힘든 날이어도 수다를 떨면 좀 괜찮아진다.<br>별 얘기 아니어도 된다. 오늘 있었던 일, 웃긴 일, 이상한 사람, 갑자기 떠오른 생각.<br>말을 하다 보면 마음속에 뭉쳐 있던 것들이 조금씩 풀린다.</p><p></p><p>심지어 아플 때도 그렇다.</p><p>어제 저녁에는 몸살이 너무 심해서 체감상 39도까지 열이 오른 것 같았다.<br>혼자 끙끙대다가 밖에 있던 오빠에게 밤 12시 반에 전화를 했다.</p><p>“오빠… 나 응급실 가야 할 것 같아…”</p><p>오빠는 너무 놀라서 바로 집에 왔고, 열을 내려주려고 이것저것 다 해줬다. (다시 한번 감사링_</p><p>그렇게 고열이 조금 내려가고 정신이 들자, 나는 바로 말했다.</p><p>“오빠… 나… 잼얘… 해줘…”</p><p>아픈 와중에도 오빠의 말을 들으며 쫑알쫑알대니, 정말로 조금 나아지는 것 같았다.<br>역시 수다는 최고의 순간 도파민이다.</p><p></p><p>이렇게 나는 크고 작은 스트레스를 풀고, 나를 가꾸고 효능감을 높인다. </p><p></p>',
    contentPreview:
      '나를 돌본다는 건, 결국 나의 상태를 안정적으로 만드는 일인 것 같다. 기분이 너무 아래로 꺼지지 않게, 스트레스가 너무 오래 고여 있지 않게, 내 마음의 컨디션을 다시 stable 하게 맞추는 일. 스트레스를 풀거나, 우울한 감정을 털어내거나, 힘든 생각에서 잠시 벗어나는 방법은 사람마다 다르고, 나의 감정이 바로바로 좋아지는 도파민 재료들을',
    author: PREVIEW_AUTHORS['pv-author-9'],
    createdAt: '2026-05-22T10:03:14.538+00:00',
    thumbnailImageURL: null,
    weekDaysFromFirstDay: null,
    comments: [
      {
        id: '020422aa-5076-4920-9ff3-033edb648acb',
        author: PREVIEW_AUTHORS['pv-author-19'],
        body: '옷, 운동, 수다라니 정말 건강한 3종세트군요',
        createdAt: '2026-05-22T13:23:51.324+00:00',
        replies: [
          {
            id: '2d3c9c68-92e9-492b-bfcd-a260aa8fbcf0',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '결국 남는건 건강뿐..ㅎㅎ',
            createdAt: '2026-05-23T00:20:05.806+00:00',
          },
        ],
      },
      {
        id: '61a8e1e2-7fd5-4fcc-83ae-3ccc3197ca0d',
        author: PREVIEW_AUTHORS['pv-author-5'],
        body: '잼얘해줘... < ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ \n연지 옷 태 정말 짱이에여.... 저도 열심히 운동하는 중 ㄱ-',
        createdAt: '2026-05-22T13:54:22.823+00:00',
        replies: [
          {
            id: '816cb0a3-685f-457d-bd66-e72fe9c44f04',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '헿 감사해유🥹\n옷 태 짱이다... 이런 말 들으면 짜릿한데!!><  집착 더 심해져~.~ㅋㅋ',
            createdAt: '2026-05-23T00:20:47.374+00:00',
          },
        ],
      },
      {
        id: '64024340-4319-42e5-ba17-afb9f2c5615d',
        author: PREVIEW_AUTHORS['pv-author-20'],
        body: "연지님 글을 쭈-욱 읽으며 맞지!맞지! 공감하다가 아파도 듣고 싶은 '잼얘해줘...'에서 빵 웃어 버렸어욬ㅋㅋㅋ ",
        createdAt: '2026-05-22T15:03:53.289+00:00',
        replies: [
          {
            id: '43272260-844e-480c-8710-af904fb9edcb',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '잼얘가 젤루 좋아유 \n매글프중독이유..ㅎㅎ',
            createdAt: '2026-05-23T00:21:09.378+00:00',
          },
        ],
      },
      {
        id: 'f5c1e0d2-3b0b-4367-bb0c-17f38f091e5c',
        author: PREVIEW_AUTHORS['pv-author-14'],
        body: '고열 후 잼얘 ㅋㅋㅋㅋㅋㅋㅋ 잼얘 사냥꾼이시군요',
        createdAt: '2026-05-24T14:01:42.977+00:00',
        replies: [
          {
            id: '930e2ea8-e186-47d1-af2f-bd5b83ff61e2',
            author: PREVIEW_AUTHORS['pv-author-9'],
            body: '잼예가 젤루 중요해용ㅋㅋ',
            createdAt: '2026-05-26T12:10:28.954+00:00',
          },
        ],
      },
    ],
  },
  {
    id: '2366e626-256f-4116-b4a8-e095e42ff5fc',
    title: '사람들이 글쓰기를 하면 세상이 좋아진다고 믿는 이유',
    body: "<p>사람들은 글쓰기를 왜 할까요?</p><p>입시, 커리어, 셀프 브랜딩, 마케팅.. 이유는 다양하겠죠.</p><p>뭘로 시작해도 상관없지만, 사실 제가 가장 중요하다고 생각하는 건 이 중에 없습니다.</p><p></p><p>저는 사람이 살아가면서 건강만큼 중요한 게 '자존'이라고 생각해요.</p><p>글쓰기는 '자존'을 위한 운동이라고 생각해요. 왜냐구요?</p><p>글을 쓰면, 생각을 하게 되잖아요. 표현하면 그게 자기의 것이 됩니다. 나의 기준을 조금씩 만들어나가는 거죠.</p><p>저는 가치관과 생각이 뛰어나서 글을 쓰는 게 아니라 그 반대라고 생각해요. 어떻게든 글을 쓰려고 노력하면서 각자 나름의 생각과 가치관과 자기 규정이 조금씩 생겨납니다. 쓰면서 깨지고, 조금씩 찢겨나가고 다시 만들어지고.</p><p>그 과정이 마치 쉽게 다치지 않는 근육을 만드는 거랑 비슷하다고 생각해요.</p><p>저는 지금 세상의, 특히 한국 사회의 큰 아쉬움 중 하나가 '자존'과 '자기 규정'의 부재라고 생각합니다. 소셜 미디어도 그렇고, 특유의 눈치 문화도 그렇고. 저는 자기 자신에게 기준점이 없이 살아갈 때 어떤 문제들이 생기는지 많이 본 거 같아요.</p><p>자존이 있는 사람은 벽돌을 쌓아도 의미를 찾고, 자존이 없는 사람은 100억이 있어도 자살하고 싶을 수 있잖아요. 나 자신의 평가와 기준점이 나 스스로에게 있느냐 아니냐의 차이라고 생각합니다.</p><p>쉽지는 않습니다. 뭐 살아보지도 않은 인생이고요. 남들이 성공이 뭐고 인생이 뭐고 말을 하지만 결국 내 인생은 내 인생입니다. 태어날 때부터 어떻게 살라고 돌에 써있지도 않잖아요.</p><p>옛날옛적처럼 임금에게 충성을 다하면 되거나 아니면 혹은 하루 농사 안 망치게만 하면 되는 그런 조금 더 단순한 사회도 더 이상 아니고요.</p><p>모든 사람이 연결되고 모든 사람이 다 모여살고 모든 것들이 더 불확실해지는 세상이라 이런 세상에서 자존을 갖고 살아가기는 그 어느때보다 어렵습니다.</p><p>기계가 육체노동을 하게 된 것을 넘어 앞으로 시대에는 기계가 점점 더 지식 노동까지 하게되는 사회가 되잖아요? 나 자신의 가치를 정의하는 것은 앞으로도 더 어려워졌으면 어려워줬지 쉽지는 않을 것 같아요.</p><p>건강하게 오래살려면 어릴 때부터 근육을 쌓아야합니다. 마찬가지로 '자존'을 나 스스로에게 찍고 살아가려면, 부지런히 나만의 정의와 기준을 만들어나가야 하는 건데요.</p><p>그 근육을 키우는 가장 좋은 방법 중 하나가 '솔직한 글쓰기'라고 생각해요.</p><p>내가 무슨 생각을 하고 어떤 인간이고 나의 추구미는 무엇인지 그럴듯하게 썰을 풀어나가는 과정이 글쓰기죠. '내 인생에 기억에 남는 사건' '내가 찹쌀도너츠를 좋아하는 이유' '내가 요즘 그 사람이 거슬리는 이유'... 이런 것들을 하나씩 쌓아가면서 나라는 인간의 가치와 기준에 대한 이야기가 생겨납니다.</p><p>그게 설령 우주적 관점에서는 먼지에 불과하다 하더라도, 한 인간이 뿌리내리고 살아가기 위한 기반으로는 충분하지 않을까요?</p><p>그래서 저는 사람들이 글쓰기를 더 많이 하면 세상이 좀 더 좋아진다고 믿습니다.</p>",
    contentPreview:
      "사람들은 글쓰기를 왜 할까요? 입시, 커리어, 셀프 브랜딩, 마케팅.. 이유는 다양하겠죠. 뭘로 시작해도 상관없지만, 사실 제가 가장 중요하다고 생각하는 건 이 중에 없습니다. 저는 사람이 살아가면서 건강만큼 중요한 게 '자존'이라고 생각해요. 글쓰기는 '자존'을 위한 운동이라고 생각해요. 왜냐구요? 글을 쓰면, 생각을 하게 되잖아요. 표현하면 그게",
    author: PREVIEW_AUTHORS['pv-author-2'],
    createdAt: '2026-06-01T14:36:17.541+00:00',
    thumbnailImageURL: null,
    weekDaysFromFirstDay: null,
    comments: [
      {
        id: 'c6d7f4cf-d50f-4ab5-9ab7-5475abe576ac',
        author: PREVIEW_AUTHORS['pv-author-10'],
        body: '한 달 정도 글을 써보니 원래는 스쳐지나가던 생각들을 머릿 속에 더 오래 붙잡을 수 있게 된 것 같습니다!',
        createdAt: '2026-06-01T14:52:31.654+00:00',
        replies: [
          {
            id: 'a6fb923c-6516-4574-8c02-0d644db2862f',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '굳굳~',
            createdAt: '2026-06-02T01:11:03.648+00:00',
          },
        ],
      },
      {
        id: 'b4d7eb61-98db-4378-89dc-46f6d6061650',
        author: PREVIEW_AUTHORS['pv-author-3'],
        body: '자존을 다듬어나가는 것, 맞는 말이군요\n\n아래는 제 개인적인 글쓰기의 유익…\n\n생각을 다듬는 과정을 자주 경험함으로써 의사소통도 잘 할 수 있다 \n남들에게 잘 읽히는 글을 쓰려는 노력으로 배려심이 깊어진다\n나를 빡치게 하는 사람이 있어도 글로 스트레스를 풀어서 실제로 해치지 않을 수 있다. (상대방과 나 둘다에게 이롭다)',
        createdAt: '2026-06-01T15:01:14.448+00:00',
        replies: [
          {
            id: 'aaf545da-3b0a-4c44-8082-ed2c2197ecb3',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '글로 빡치게 하는 사람 스트레스를 풀 수 있다니..!',
            createdAt: '2026-06-02T01:12:23.206+00:00',
          },
        ],
      },
      {
        id: 'f18d90a3-7f1a-44c3-be80-e3018cb51800',
        author: PREVIEW_AUTHORS['pv-author-6'],
        body: '진심이 느껴집니다',
        createdAt: '2026-06-01T23:26:15.325+00:00',
        replies: [
          {
            id: 'df15697e-bc34-4393-acc0-6c59ab2d6440',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '감사합니다',
            createdAt: '2026-06-02T01:12:34.802+00:00',
          },
        ],
      },
      {
        id: '6ede5f1f-0e35-4c7a-8083-1acd1237fd37',
        author: PREVIEW_AUTHORS['pv-author-11'],
        body: '솔직한 글쓰기.. 너무 공감되네용',
        createdAt: '2026-06-02T00:57:04.73+00:00',
        replies: [
          {
            id: '3249aef7-fbdc-4d75-9fee-30c2a419e64f',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '사람은 취약성을 드러내는 순간마다 강해진다고..',
            createdAt: '2026-06-02T01:13:23.183+00:00',
          },
        ],
      },
      {
        id: '5b5ddc1c-0881-4393-8391-47e3531fa514',
        author: PREVIEW_AUTHORS['pv-author-9'],
        body: '범근님이 자존감이 높고 그릇이 크신 이유는 글쓰기때문이군예 \n글쓰기의 산증인!!!!',
        createdAt: '2026-06-02T01:13:04.154+00:00',
        replies: [
          {
            id: 'c5f65c1c-cb71-4270-a377-a48441836857',
            author: PREVIEW_AUTHORS['pv-author-2'],
            body: '아리가또네~',
            createdAt: '2026-06-02T01:13:44.341+00:00',
          },
        ],
      },
      {
        id: 'f81fdb59-f61f-47b2-962d-a5ea748e9e5f',
        author: PREVIEW_AUTHORS['pv-author-5'],
        body: '너무 좋은 글이네요..\n매일 글쓰기를 해야한다고 생각하는 이유가 뭘까, 글쓰기가 세상응 구한다 말씀하시는 이유가 뭘까 궁근했는데.. 훌륭한 답변 감사해유~~~~',
        createdAt: '2026-06-02T02:00:27.017+00:00',
        replies: [],
      },
      {
        id: '0a908dca-6a51-4272-8ab8-87a3c0c92930',
        author: PREVIEW_AUTHORS['pv-author-12'],
        body: '너무 공감가는 말이네요! 기준은 참 중요하다는 생각을 하는데, 기준을 세우려면 생각을 해야 하고, 생각을 하기 위한 시간을 글쓰면서 나에게 줘야 하는 느낌..~~',
        createdAt: '2026-06-02T10:49:37.143+00:00',
        replies: [],
      },
    ],
  },
  {
    id: 'f37e2cb5-9e67-4ef5-9224-513574ec226a',
    title: '민방위 강사님의 웅변',
    body: '<p>월요일에 민방위 교육에 다녀왔다.</p><p>총 4시간. 1교시 전쟁 대비, 2교시 화생방. 3교시가 재난 안전이었다. 대부분은 예상한 대로. 사람들은 핸드폰을 보거나 졸았고, 영혼이 빠진 채로 앉아 있는 사람들로 가득했다.</p><p>그런데 3교시 재난 강사님은 달랐다.</p><img src="/preview/posts/223721_IMG_7200.jpg" alt="IMG_7200.jpeg"><p>첫 마디가 이거였다. "방화문 닫고 들어오세요." 그게 핵심이라고 했다. 방화문은 항상 닫혀 있어야 한다고.</p><p>강사님은 소리를 질렀다. "여러분, 이거 하나만 알면 사람이 죽고 살아요. 몰라서 죽었어요, 예?" 어찌나 크게 말을 하는지 마이크에 펑, 펑 공기음을 터졌다.</p><p>왜 재난을 알아야 되고 어쩌고 한참 5분 이상을 웅변헀다. 정말 웅변이었다. 그리고 나서 한참 뒤에</p><blockquote><p>"아차 내 정신 좀 봐. 제가 자기 소개를 안했네요? 근데 이게 정말 중요해서 그래요. 마음이 급해. 지금 여러분 일찍 끝내주고 싶은데 중요한 내용이 많습니다"</p></blockquote><p>강사님은 33년간 소방관으로 근무하고, 분당 소방서에서 정년 퇴직한 분이라고 했다.</p><p>얼마 전 대전 안전공업 화재 얘기를 했다. 70명 넘게 죽고 다쳤다고. 왜 그렇게 많이 당했는지 아냐고 물었다. 금속 화재라서 그렇다고 했다. 나트륨이 들어 있어서 물로 끄질 못했다고. 처음 듣는 얘기였다. (안전 불감증인가보다)</p><p>나중에 찾아보니 정말이었다. 화재는 1년에 3-4천 건씩 꾸준히 나고, 그 절반이 부주의 때문이라고 한다.</p><p>부천 호텔 화재 얘기도 했다. 에어매트를 펴 놓은 상태에서 8층에서 사람이 떨어져 죽었다고.</p><p>실제 영상을 보여주는데 충격적이었다. 호텔에 불이 나니까 관중들이 다 모여서 구경하고 스마트폰으로 영상을 찍었는데. 8층에서 연기가 가득하고 갇혀있는 2명의 사람들이 창밖에 보였다. 그런데 누가 핸드폰으로 찍으면서 "뛰어야 돼, 뛰어야 돼"라고 외치는 목소리가 들렸다.</p><p>이 강사님은 부천시 민방위 강사이기도 해서, 그 일이 일어난 날 현장 후배한테 전화를 걸었다고 했다. 다음날엔 응급실에 가서 사람들을 인터뷰까지 했다고.</p><p>1시간 30분짜리 강의였다. 앞에 앉은 사람들 절반은 졸고 있었다. 그런데도 강사님은 처음부터 끝까지 고래고래 소리를 질렀다.</p><blockquote><p>"이 사람들이 절대로 8층에선 뛰어내리면 안된다는 거, 에어매트는 반드시 가운데 뛰어내려야하고 20초 이상은 기다려야 된다는 거만 알았어도 안 죽었을 거예요. 내가 관중한테 가서 물어보고 싶었다니까. 당신 뛰어내려봤어? 안 뛰어내려봤으면서 뭘 뛰라고 외치고 있어. 허유 내가 정말 허유.."</p></blockquote><p>솔직히 강의라고 치면 정신도 없고 깔끔하게 전달하는 그런 느낌은 아니었지만, 어느 순간 나는 몰입하고 있었다. 감정이 전달이 된다고 해야할까.</p><p>문득 궁금했다. 저렇게 맥아리 없는 사람들 앞에서 왜 저렇게까지 할까.</p><p>잘은 모르겠지만, 본인이 \'사람 구하는 일\'을 한다는 확신 같은 게 있었다. 월급이 중요해? 지위가 중요해? 뉴스에 나오는 게 중요해? 사람을 살려야지. 안 죽어도 될 사람을. 딱 그렇게 말하는 느낌이었다.</p><p>생명을 구하는 사람들, 살려야지, 라는 가치를 말하는 사람은 우리 인간의 근본적인 생존/인도적 욕구를 건드려서인지 뭔가 숭고함이 느껴진다.</p><p>약간 이국종 교수 같은 사람들 보면 느껴지는 그런 느낌이 있지 않나? 물론 이 민방위 강사님이 대단한 영웅적 행동을 한 건 아니지만. 적어도 진짜 돈만 받고 적당히 하다 가려는 그런 모습은 안 보였다. 정말 이걸로 사람하나 구한다는 듯이 간절하셨다.</p><p>가치를 강하게 믿는 사람한테서는 뭔가가 풍긴다. 예의나 체면 같은 걸 던질 때. 진짜 예의가 없는 게 아니라, 더 중요한 게 있다고 확신하는 사람의 그 마음.</p><p>민방위 끝나고 돌아오면서 왠지 기억에 남았다. 나도 어떠한 가치를 추구하고, 그 가치를 위해서 다른 가치를 던지는 그런 삶을 살고 싶다는 생각을 했다.</p>',
    contentPreview:
      '월요일에 민방위 교육에 다녀왔다. 총 4시간. 1교시 전쟁 대비, 2교시 화생방. 3교시가 재난 안전이었다. 대부분은 예상한 대로. 사람들은 핸드폰을 보거나 졸았고, 영혼이 빠진 채로 앉아 있는 사람들로 가득했다. 그런데 3교시 재난 강사님은 달랐다. 첫 마디가 이거였다. "방화문 닫고 들어오세요." 그게 핵심이라고 했다. 방화문은 항상 닫혀 있어야',
    author: PREVIEW_AUTHORS['pv-author-2'],
    createdAt: '2026-06-23T13:34:45.941+00:00',
    thumbnailImageURL:
      '/preview/posts/223721_IMG_7200.jpg',
    weekDaysFromFirstDay: null,
    comments: [
      {
        id: 'f8f23eda-74c4-48e3-8890-4d4d53caa66f',
        author: PREVIEW_AUTHORS['pv-author-5'],
        body: '이국종 교수 예시가 진짜 딱이네요.. \n뭔가 퉁먕스러우신가 싶은데 그게 중요한게 아닌거.. 그래서 뭔가 간지남. 멋진 화재강사다. ',
        createdAt: '2026-06-23T15:13:58.105+00:00',
        replies: [],
      },
      {
        id: '9bbc9250-b6cd-47ed-8211-673afe8312a6',
        author: PREVIEW_AUTHORS['pv-author-13'],
        body: '역시 진심은 통하나봅니다. 결국 강사의 가장 중요한 능력은 기술적인것보다 마음을 움직이는 것이라는 것 교육담당자로서 잘 배워갑니다ㅋㅋㅋㅋㅋㅋ',
        createdAt: '2026-06-24T10:26:31.686+00:00',
        replies: [],
      },
    ],
  },
];


function withCommentTallies(content: PreviewPostContent): PreviewPost {
  const countOfReplies = content.comments.reduce((total, comment) => total + comment.replies.length, 0);
  return { ...content, countOfComments: content.comments.length, countOfReplies };
}

export const PREVIEW_POSTS: PreviewPost[] = PREVIEW_POST_CONTENTS.map(withCommentTallies);
