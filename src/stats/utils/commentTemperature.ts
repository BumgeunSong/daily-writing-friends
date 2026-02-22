export function calculateCommentTemperature(commentCount: number): number {
  if (commentCount === 0) {
    return 0.0;
  }

  if (commentCount >= 1 && commentCount <= 10) {
    return 36.5;
  }

  // Each block of 10 comments (11-20, 21-30, etc.) adds 0.5℃
  const additionalBlocks = Math.floor((commentCount - 1) / 10);
  const temperature = 36.5 + additionalBlocks * 0.5;

  // Cap at 100.0
  const cappedTemperature = Math.min(temperature, 100.0);

  return Math.round(cappedTemperature * 10) / 10;
}
