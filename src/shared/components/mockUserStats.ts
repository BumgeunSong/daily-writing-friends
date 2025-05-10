import { WritingStats } from "@/stats/model/WritingStats"

export const mockUserStats: WritingStats = {
  user: {
    id: "1",
    nickname: "매글프",
    realname: "김매글",
    profilePhotoURL: "https://github.com/shadcn.png",
    bio: "매일 글쓰기를 실천하는 프렌즈"
  },
  contributions: [
    { createdAt: "2024-02-21", contentLength: 100 },
    { createdAt: "2024-02-22", contentLength: 100 },
    { createdAt: "2024-02-23", contentLength: 200 },
    { createdAt: "2024-02-24", contentLength: 300 },
    { createdAt: "2024-02-25", contentLength: 100 },
    { createdAt: "2024-02-26", contentLength: 0 },
    { createdAt: "2024-02-27", contentLength: 100 },
    { createdAt: "2024-02-28", contentLength: 100 },
    { createdAt: "2024-03-01", contentLength: 100 },
    { createdAt: "2024-03-02", contentLength: 0 },
    { createdAt: "2024-03-03", contentLength: 200 },
    { createdAt: "2024-03-04", contentLength: 300 },
    { createdAt: "2024-03-05", contentLength: 100 },
    { createdAt: "2024-03-06", contentLength: 400 },
    { createdAt: "2024-03-07", contentLength: 200 },
    { createdAt: "2024-03-08", contentLength: 100 },
    { createdAt: "2024-03-09", contentLength: 300 },
    { createdAt: "2024-03-10", contentLength: 200 },
    { createdAt: "2024-03-11", contentLength: 100 },
    { createdAt: "2024-03-12", contentLength: 400 },
    { createdAt: "2024-03-13", contentLength: 200 },
    { createdAt: "2024-03-14", contentLength: 300 },
  ],
  badges: [
    { name: "연속 12일", emoji: "🔥" }
  ],
  recentStreak: 5
} 