// src/orchestrator/fallbacks.js
// Deterministic, clearly-labelled local fallbacks — used automatically
// whenever the live LLM call fails or a response fails the ontology
// guardrail, so the panel never fails silently and never fabricates a
// hallucinated result. Every fallback string says "(Deterministic
// fallback)" so it can never be mistaken for genuine agent reasoning.
//
// Per principle #26 ("humility is a comparative advantage" / never
// manufacture confidence), a deterministic fallback is BY DEFINITION not
// real evidence-weighing — so every fallback here honestly self-reports
// evidence_sufficiency: 'INSUFFICIENT' and caps its own confidence at
// FALLBACK_CONFIDENCE_CEILING accordingly, rather than presenting
// arithmetic dressed up as a confident agent view.

const FALLBACK_CONFIDENCE_CEILING = 30;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}
function clamp(v, lo, hi) {
  return round1(Math.max(lo, Math.min(hi, v)));
}
function round1(v) {
  return Math.round(v * 10) / 10;
}
function seededRand(seedText) {
  return mulberry32(hashCode(seedText) >>> 0);
}
// Confidence for any fallback output: same seeded jitter as before, but
// rescaled into [10, FALLBACK_CONFIDENCE_CEILING] instead of [30,90] — a
// fallback has no real evidence behind it, so it must never present as
// more confident than an honest INSUFFICIENT-evidence agent is allowed to.
function fallbackConfidence(rnd) {
  return clamp(10 + rnd() * (FALLBACK_CONFIDENCE_CEILING - 10), 10, FALLBACK_CONFIDENCE_CEILING);
}

export function fallbackDiagnostic(agent, layerTitle, ctx, seedText) {
  const rnd = seededRand(agent.id + layerTitle + seedText);
  const base = parseFloat(ctx.riskIndex) || 50;
  const noise = (rnd() - 0.5) * 10;
  const risk_contribution = clamp(base + (agent.tilt || 0) + noise, 2, 98);
  const confidence = fallbackConfidence(rnd);
  const flag = risk_contribution > 68 ? 'RED' : risk_contribution > 42 ? 'AMBER' : 'GREEN';
  return {
    assessment: `(Deterministic fallback) The ${agent.name} reading tracks the model's own ${ctx.riskIndex}-point risk index with a ${agent.name.toLowerCase()}-specific adjustment; live reasoning was unavailable for this agent, so treat this figure as a low-confidence placeholder, not an independent judgement.`,
    evidence: `(Deterministic fallback) Anchored to ${ctx.dominantSector} and the top driver "${ctx.topDrivers[0] || 'n/a'}" — arithmetic, not evidence-weighing.`,
    risk_contribution,
    confidence,
    flag,
    key_assumption: `(Deterministic fallback) Assumes the model's own risk index remains the best available proxy for this dimension in the absence of live reasoning — likely wrong if ${agent.name.toLowerCase()} conditions have diverged from the aggregate.`,
    evidence_sufficiency: 'INSUFFICIENT',
  };
}

export function fallbackInterpretation(agent, ctx, seedText) {
  const rnd = seededRand(agent.id + 'interpretation' + seedText);
  const base = parseFloat(ctx.burstProb) || 30;
  const noise = (rnd() - 0.5) * 6;
  const forecast_probability = clamp(base + (agent.tilt || 0) + noise, 2, 98);
  const confidence = fallbackConfidence(rnd);
  return {
    forecast_probability,
    case: `(Deterministic fallback) Anchored to the model's own ${ctx.burstProb}% reading with a ${agent.name.toLowerCase()}-leaning adjustment; live reasoning was unavailable for this agent, so this is arithmetic, not an argued case.`,
    leans_on: '(Deterministic fallback — live reasoning unavailable.)',
    confidence,
    key_assumption: `(Deterministic fallback) Assumes the model's own burst-probability reading is a reasonable base rate for this agent's stance — likely wrong if the ${agent.name.toLowerCase()} view would genuinely diverge from that base rate.`,
    evidence_sufficiency: 'INSUFFICIENT',
  };
}

export function fallbackAuditor(ctx) {
  const rnd = seededRand('auditor' + ctx.country + ctx.horizon);
  return {
    audit_summary: `(Deterministic fallback) No live audit was available; treat every layer's confidence values as unverified and weight the ${ctx.backtest.includes('no historical') ? 'absent' : 'small'} backtest sample accordingly.`,
    data_integrity_flag: 'CAUTION',
    confidence: fallbackConfidence(rnd),
    concerns: ['(Deterministic fallback) Live audit reasoning was unavailable for this run — no genuine cross-layer consistency check was performed.'],
    double_counted_drivers: [],
    key_assumption: '(Deterministic fallback) Assumes the panel below is internally consistent — this was not actually checked.',
    evidence_sufficiency: 'INSUFFICIENT',
  };
}

export function fallbackCounsel(side, ctx) {
  const isProsecutor = side === 'prosecutor';
  const rnd = seededRand(side + ctx.country + ctx.horizon);
  return {
    case_summary: `(Deterministic fallback) Live ${isProsecutor ? 'prosecution' : 'defense'} reasoning was unavailable; this is a placeholder position anchored to the model's own ${ctx.burstProb}% reading, ${isProsecutor ? 'tilted toward elevated risk' : 'tilted toward contained risk'} — not an argued case.`,
    key_evidence: [`(Deterministic fallback) Model risk index ${ctx.riskIndex}/100`, `(Deterministic fallback) Dominant sector: ${ctx.dominantSector}`],
    probability_assertion: clamp((parseFloat(ctx.burstProb) || 30) + (isProsecutor ? 15 : -15), 2, 98),
    confidence: fallbackConfidence(rnd),
    weakest_point_conceded: '(Deterministic fallback — live reasoning unavailable for this agent.)',
    key_assumption: `(Deterministic fallback) Assumes a flat ${isProsecutor ? '+15' : '-15'}-point adjustment to the model's own reading is a reasonable stand-in for a genuinely argued ${side} case — it is not.`,
    evidence_sufficiency: 'INSUFFICIENT',
  };
}

const HISTORICAL_ANALOGUES_POOL = [
  'Japan asset-price bubble, 1989-1991',
  'US dot-com bubble, 1999-2001',
  'US housing / subprime bubble, 2006-2008',
  'Crypto-asset bubble, 2021-2022',
  'China property-sector deleveraging, 2021-present',
];

export function fallbackJudge(ctx, layerResultsByKey, auditorResult, prosecutorResult, defenderResult) {
  const flat = Object.values(layerResultsByKey).flat();
  const diagnostics = flat.filter((e) => e.output.risk_contribution !== undefined);
  const interpretations = flat.filter((e) => e.output.forecast_probability !== undefined);

  const diagAvg = diagnostics.length ? diagnostics.reduce((s, e) => s + e.output.risk_contribution, 0) / diagnostics.length : parseFloat(ctx.riskIndex) || 50;
  const interpTotalW = interpretations.reduce((s, e) => s + (e.output.confidence || 50), 0) || 1;
  const interpWeighted = interpretations.length
    ? interpretations.reduce((s, e) => s + e.output.forecast_probability * (e.output.confidence || 50), 0) / interpTotalW
    : parseFloat(ctx.burstProb) || 30;

  const risk_score = clamp(0.4 * diagAvg + 0.6 * interpWeighted, 0, 100);
  // Confidence for a fallback verdict is capped like every other fallback
  // output — this is arithmetic aggregation, not a Judge's reasoned
  // weighing, so it must never present as more certain than an honest
  // INSUFFICIENT-evidence agent is allowed to (widenForDisagreement in
  // uncertainty.js will narrow this further based on actual panel spread).
  const rnd = seededRand('judge' + ctx.country + ctx.horizon);
  const confidence = fallbackConfidence(rnd);

  const verdict_label = risk_score >= 70 ? 'Critical' : risk_score >= 50 ? 'Elevated' : risk_score >= 30 ? 'Watchful' : 'Contained';

  const redFlags = diagnostics.filter((e) => e.output.flag === 'RED').sort((a, b) => b.output.risk_contribution - a.output.risk_contribution);
  const driverEntries = redFlags.length ? redFlags : diagnostics.slice().sort((a, b) => b.output.risk_contribution - a.output.risk_contribution);
  const drivers = driverEntries.slice(0, 3).map((e) => `${e.agentName}: ${e.output.assessment}`);
  if (!drivers.length) drivers.push(...ctx.topDrivers.slice(0, 3));

  const greenFlags = diagnostics.filter((e) => e.output.flag === 'GREEN').sort((a, b) => a.output.risk_contribution - b.output.risk_contribution);
  let countervailing_evidence = (defenderResult.key_evidence && defenderResult.key_evidence.length ? defenderResult.key_evidence : greenFlags.map((e) => e.output.assessment)).slice(0, 3);
  // Judge validation (and #19/#20) requires at least 2 genuine countervailing
  // points — pad with the lowest diagnostic risk_contribution reading if the
  // above didn't produce enough, so the fallback never ships an unfalsifiable
  // one-sided verdict.
  if (countervailing_evidence.length < 2) {
    const extra = diagnostics
      .slice()
      .sort((a, b) => a.output.risk_contribution - b.output.risk_contribution)
      .map((e) => `${e.agentName}: ${e.output.assessment}`)
      .filter((s) => !countervailing_evidence.includes(s));
    countervailing_evidence = countervailing_evidence.concat(extra).slice(0, Math.max(2, countervailing_evidence.length));
  }
  if (countervailing_evidence.length < 2) {
    countervailing_evidence = [
      ...countervailing_evidence,
      '(Deterministic fallback) No live counter-case was generated this run — this absence is itself a limitation, not evidence the risk reading is uncontested.',
    ].slice(0, 2);
  }

  const systemicTop = (layerResultsByKey.systemicRisk || []).slice().sort((a, b) => b.output.risk_contribution - a.output.risk_contribution)[0];
  const primarySource = driverEntries[0] || systemicTop || diagnostics[0];

  return {
    risk_score,
    confidence,
    verdict_label,
    drivers: drivers.length ? drivers : ['(Deterministic fallback) No dominant driver identified.'],
    countervailing_evidence,
    trigger: systemicTop
      ? `(Deterministic fallback) Most likely proximate trigger runs through ${systemicTop.agentName}: ${systemicTop.output.assessment}`
      : `(Deterministic fallback) No single dominant trigger identified beyond the model's own top driver, ${ctx.topDrivers[0] || 'n/a'}.`,
    transmission_channel: '(Deterministic fallback) Live synthesis was unavailable; assume the leverage and contagion channels flagged above are the primary transmission paths until re-run with live reasoning.',
    historical_analogues: HISTORICAL_ANALOGUES_POOL.slice(0, 2),
    disagreement: `(Deterministic fallback) Prosecutor asserted ${prosecutorResult.probability_assertion}%, Defender asserted ${defenderResult.probability_assertion}% — a ${round1(Math.abs(prosecutorResult.probability_assertion - defenderResult.probability_assertion))}-point spread not resolved by live judge reasoning in this run.`,
    primary_evidence_source: primarySource ? `${primarySource.agentName} (${primarySource.output.risk_contribution ?? 'n/a'} risk_contribution)` : `(Deterministic fallback) ${ctx.topDrivers[0] || 'model top driver'}`,
    falsification_condition: `(Deterministic fallback) This reading would need revising if ${primarySource ? primarySource.agentName : 'the dominant driver'} reversed independently of the rest of the panel — but no live synthesis actually evaluated that scenario in this run.`,
    key_assumption: '(Deterministic fallback) Assumes a 0.4/0.6 blend of the diagnostic layers and the confidence-weighted Interpretation layer is a reasonable stand-in for reasoned synthesis — it is not a substitute for the Judge actually weighing the record.',
    evidence_sufficiency: 'INSUFFICIENT',
    confidence_ceiling: FALLBACK_CONFIDENCE_CEILING,
    confidence_ceiling_rationale: '(Deterministic fallback) No live model reasoning evaluated data quality this run, so confidence is capped at the same low ceiling every fallback output uses, regardless of how the arithmetic above resolves.',
  };
}
