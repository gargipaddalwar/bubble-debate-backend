// src/orchestrator/uncertainty.js
// Operationalises principle #8 ("Variance destroys overconfidence") as
// arithmetic, not prompt language. However confident the Judge's own raw
// output claims to be, the orchestrator recomputes a confidence interval
// and a hard confidence cap FROM THE PANEL'S ACTUAL SPREAD OF OPINION —
// so a Judge (live or fallback) cannot simply average away real
// disagreement between the panel's own agents. This runs unconditionally,
// after every debate, on both the live and the deterministic-fallback
// verdict path.

function round1(v) {
  return Math.round(v * 10) / 10;
}
function clampNum(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Measures how much the panel actually disagreed, using the Interpretation
 * layer's forecasts as the primary signal (that's the layer whose whole
 * job is to form an independent view), falling back to the diagnostic
 * layers' risk_contribution spread if Interpretation is empty for some
 * reason.
 */
export function computeDisagreementStats(layerResultsByKey) {
  const interp = (layerResultsByKey.interpretation || [])
    .map((e) => e.output && e.output.forecast_probability)
    .filter((v) => typeof v === 'number');
  const diag = Object.values(layerResultsByKey)
    .flat()
    .filter((e) => e.output && e.output.risk_contribution !== undefined)
    .map((e) => e.output.risk_contribution);
  const pool = interp.length ? interp : diag;
  if (!pool.length) return { spread: 0, stdev: 0, n: 0 };
  const spread = Math.max(...pool) - Math.min(...pool);
  const mean = pool.reduce((a, b) => a + b, 0) / pool.length;
  const variance = pool.reduce((a, b) => a + (b - mean) ** 2, 0) / pool.length;
  return { spread: round1(spread), stdev: round1(Math.sqrt(variance)), n: pool.length };
}

/**
 * Returns a NEW verdict object (does not mutate the input) with:
 *  - confidence_interval: [lo, hi] around risk_score, widened by real
 *    panel disagreement (spread + stdev), not just asserted by the Judge.
 *  - disagreement_spread: the raw spread that drove the widening, so it's
 *    auditable rather than a black box.
 *  - confidence: capped downward as disagreement rises (spread of 40+
 *    points across the Interpretation layer should never coexist with a
 *    90+ Judge confidence), and additionally capped by the verdict's own
 *    stated confidence_ceiling if present (#26) — whichever cap is
 *    stricter wins.
 */
export function widenForDisagreement(verdict, layerResultsByKey) {
  const { spread, stdev } = computeDisagreementStats(layerResultsByKey);
  const halfWidth = clampNum(8 + spread * 0.5 + stdev * 0.8, 5, 45);
  const riskScore = typeof verdict.risk_score === 'number' ? verdict.risk_score : 50;
  const lo = round1(clampNum(riskScore - halfWidth, 0, 100));
  const hi = round1(clampNum(riskScore + halfWidth, 0, 100));

  const disagreementCap = clampNum(100 - spread * 0.6, 10, 100);
  const rawConfidence = typeof verdict.confidence === 'number' ? verdict.confidence : 50;
  let cappedConfidence = Math.min(rawConfidence, disagreementCap);
  if (typeof verdict.confidence_ceiling === 'number') {
    cappedConfidence = Math.min(cappedConfidence, verdict.confidence_ceiling);
  }

  return {
    ...verdict,
    confidence: round1(clampNum(cappedConfidence, 5, 100)),
    confidence_interval: [lo, hi],
    disagreement_spread: spread,
  };
}
