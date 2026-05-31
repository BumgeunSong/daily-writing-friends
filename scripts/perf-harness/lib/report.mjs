// Human-readable measurement report. Shows the normalized F2 gradient AND the
// raw ms values side by side. LH (simulate) and WV (real) sit in different
// regimes for FCP/LCP, so we show that ratio as insight, not a tripwire; the
// only absolute cross-check is CLS (same DOM → must match).

const ROUTE_LABEL = {
  root: '/ (→/boards)',
  boardFeed: '/board/*',
  postDetail: '/board/*/post/*',
  notifications: '/notifications',
};

// CLS is measured off the same DOM by both engines, so any gap above this is a
// measurement bug, not a regime difference.
const CLS_MATCH_EPS = 0.01;

export function printReport(result) {
  const line = '─'.repeat(72);
  console.log(`\n${line}`);
  console.log(
    `Web Vitals report  ${result.timestamp}  (median-${result.runs}, mobile, real-throttled reward)`,
  );
  console.log(line);

  if (result.overall != null) {
    console.log(`OVERALL F2 SCORE: ${fmtScore(result.overall)}  (0 = baseline, 1 = "good")`);
  } else {
    console.log('OVERALL F2 SCORE: n/a (no baseline yet — run with --set-baseline)');
  }
  console.log('');

  for (const [key, r] of Object.entries(result.routes)) {
    const label = ROUTE_LABEL[key] ?? key;
    const score = r.routeScore != null ? fmtScore(r.routeScore) : 'n/a';
    console.log(`▸ ${label}   route_score=${score}   traffic=${r.traffic}`);
    console.log(
      `    WV*  LCP ${ms(r.webVitals.lcp)}  FCP ${ms(r.webVitals.fcp)}  ` +
        `CLS ${cls(r.webVitals.cls)}  TTFB ${ms(r.webVitals.ttfb)}   ◀ reward`,
    );
    console.log(
      `    LH   LCP ${ms(r.lighthouse.lcp)}  FCP ${ms(r.lighthouse.fcp)}  ` +
        `CLS ${cls(r.lighthouse.cls)}  TBT ${ms(r.lighthouse.tbt)}  SI ${ms(r.lighthouse.si)}  ` +
        `perf=${r.lighthouse.score}   ◀ xcheck`,
    );
    if (r.sub) {
      console.log(
        `    s    lcp=${sub(r.sub.lcp.s)}  fcp=${sub(r.sub.fcp.s)}  cls=${sub(r.sub.cls.s)}`,
      );
    }
    console.log(
      `    xcheck  CLS ${clsMatch(r.agreement.clsDelta)}   ` +
        `WV/LH LCP ${ratio(r.agreement.lcpRatio)} FCP ${ratio(r.agreement.fcpRatio)} (sim→real gap)`,
    );
  }
  console.log(line);
}

function fmtScore(x) {
  return x.toFixed(4);
}
function ms(v) {
  return v == null ? '  —  ' : `${Math.round(v)}ms`.padStart(7);
}
function cls(v) {
  return v == null ? '—' : v.toFixed(3);
}
function sub(v) {
  return v == null ? '—' : v.toFixed(3);
}
function clsMatch(delta) {
  if (delta == null) return '—';
  const flag = delta > CLS_MATCH_EPS ? ` ⚠DIVERGE Δ${delta.toFixed(3)}` : ' ✓';
  return `Δ${delta.toFixed(3)}${flag}`;
}
function ratio(r) {
  return r == null ? '—' : `${r.toFixed(1)}×`;
}
