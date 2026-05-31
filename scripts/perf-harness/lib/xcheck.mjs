// Guardrail #1 (adapted for the web-vitals reward): the reward-hack tripwire.
//
// The reward is now real-throttled web-vitals wall-clock, which is hard to fake
// without actually breaking the page (gate #2 catches outright breakage). What's
// left to catch is subtler gaming, so Lighthouse-simulate stays on as an
// independent second opinion:
//
//   1. CLS match (single-shot, no history needed): both engines measure CLS off
//      the SAME DOM, so they must agree per route. Divergence means the two
//      loads rendered differently — non-determinism or a half-broken page —
//      and the reward can't be trusted.
//   2. Directional (needs an accepted-iteration history): a genuine speed-up
//      (smaller bundle, less JS) helps BOTH real and simulated. If the WV reward
//      improves on a route while Lighthouse-simulate clearly regresses there,
//      the change likely gamed real-throttled timing rather than the real
//      critical path → flag.

const CLS_EPS = 0.01; // same DOM → CLS must match within this
const LH_REGRESS_MS = 300; // LH LCP worsening beyond this while WV improved is suspicious
const WV_IMPROVE_MS = 150; // what counts as a real WV improvement on a route

/**
 * @param current  snapshot: { metrics: { key: { wv:{lcp,fcp,cls}, lh:{lcp,fcp,cls,perf} } } }
 * @param best     previous best snapshot (best.metrics[key].lh may be null at baseline)
 * @returns { ok, flags }
 */
export function crossCheck(current, best) {
  const flags = [];

  for (const [key, m] of Object.entries(current.metrics)) {
    const wv = m.wv;
    const lh = m.lh;
    if (!wv || !lh) continue;

    // (1) CLS agreement — same DOM, must match.
    if (wv.cls != null && lh.cls != null && Math.abs(wv.cls - lh.cls) > CLS_EPS) {
      flags.push(`${key}: CLS mismatch wv=${wv.cls.toFixed(3)} vs lh=${lh.cls.toFixed(3)} (different render?)`);
    }

    // (2) Directional — only when we have a prior LH reading on this route.
    const prior = best.metrics?.[key];
    if (prior?.wv && prior?.lh && wv.lcp != null && lh.lcp != null) {
      const wvImproved = prior.wv.lcp - wv.lcp > WV_IMPROVE_MS;
      const lhRegressed = lh.lcp - prior.lh.lcp > LH_REGRESS_MS;
      if (wvImproved && lhRegressed) {
        flags.push(
          `${key}: WV LCP improved ${Math.round(prior.wv.lcp)}→${Math.round(wv.lcp)} but LH LCP regressed ${Math.round(prior.lh.lcp)}→${Math.round(lh.lcp)} (possible reward-hack)`,
        );
      }
    }
  }

  return { ok: flags.length === 0, flags };
}
