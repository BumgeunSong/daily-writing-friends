export function calculateEngagementScore(
  countOfComments: number | undefined,
  countOfReplies: number | undefined,
  countOfLikes: number | undefined
): number {
  const comments = countOfComments ?? 0;
  const replies = countOfReplies ?? 0;
  const likes = countOfLikes ?? 0;

  return comments + replies + likes;
}

export function shouldUpdateEngagementScore(
  previousScore: number | undefined,
  newScore: number
): boolean {
  const prevScore = previousScore ?? -1;
  return prevScore !== newScore;
}
