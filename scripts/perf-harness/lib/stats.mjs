// Small numeric helpers for aggregating noisy measurements.

export function median(arr) {
  if (arr.length === 0) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function mean(arr) {
  if (arr.length === 0) return NaN;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

export function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}

export function summarize(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return {
    n: arr.length,
    min: s[0],
    max: s[s.length - 1],
    median: median(arr),
    mean: round(mean(arr), 2),
    std: round(std(arr), 4),
  };
}

export function round(x, dp = 2) {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}
