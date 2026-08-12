// src/validation/ontologyGuardrail.js
// Same domain constraints as the dashboard's client-side guardrail, run here
// too so a malicious or buggy client can't skip validation. One validator
// per agent "shape" in the hierarchy — diagnostic (Reality / Market
// Behaviour / Systemic Risk), interpretation, auditor, counsel (prosecutor
// or defender), and judge (final verdict).
//
// Beyond field presence/range, this file also mechanically enforces four of
// the panel's 26 governing principles, so an agent can't satisfy them in
// prose while its structured output still asserts false certainty:
//   #6  — no deterministic language ("will happen", "is certain", ...)
//         anywhere in an agent's free text.
//   #8  — an agent that marks its own evidence INSUFFICIENT must also
//         report low confidence (<=30) — it cannot claim both weak
//         evidence and a confident number.
//   #19 — every agent must name a concrete assumption it could be wrong
//         about (key_assumption).
//   #20/26 — the Judge's verdict must cite the specific evidence that
//         drove it, name a falsification condition, and report a
//         confidence ceiling derived from data quality that its own
//         confidence may never exceed; it must also cite genuine
//         countervailing evidence, not just supporting evidence.

const RANGE = [0, 100];
const FLAGS = ['GREEN', 'AMBER', 'RED'];
const INTEGRITY_FLAGS = ['PASS', 'CAUTION', 'FAIL'];
const VERDICT_LABELS = ['Contained', 'Watchful', 'Elevated', 'Critical'];
const EVIDENCE_SUFFICIENCY = ['SUFFICIENT', 'LIMITED', 'INSUFFICIENT'];
const INSUFFICIENT_CONFIDENCE_CEILING = 30;

const isNum = (v) => typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isNonEmptyStrArray = (v) => Array.isArray(v) && v.length > 0 && v.every(isNonEmptyStr);

// ---- #6: deterministic-language scan ----
// Flags bare "will <verb>" assertions (not hedged by a likelihood word
// immediately after "will") plus a denylist of certainty phrases. Applied
// to every free-text field and string-array field in an agent's raw
// output before it's trusted.
const WILL_HEDGE_WORDS = new Set([
  'likely', 'probably', 'possibly', 'plausibly', 'potentially', 'tend', 'tends',
  'need', 'needs', 'require', 'requires', 'depend', 'depends', 'help', 'helps',
  'often', 'sometimes', 'generally', 'typically', 'vary', 'varies',
]);
const CERTAINTY_PHRASES = [
  /\bis certain\b/i,
  /\bcertain to\b/i,
  /\bguaranteed\b/i,
  /\bwithout (a )?doubt\b/i,
  /\bdefinitely\b/i,
  /\binevitably\b/i,
  /\bfor certain\b/i,
  /\b100% (certain|sure)\b/i,
  /\bno doubt\b/i,
  /\bwill (happen|occur|burst|crash|collapse|reverse)\b/i,
];

function scanTextForDeterminism(text) {
  const found = [];
  const re = /\bwill\s+([a-z]+)/gi;
  let m;
  while ((m = re.exec(text))) {
    if (!WILL_HEDGE_WORDS.has(m[1].toLowerCase())) {
      found.push(`deterministic phrasing "${m[0]}" (use a probability or likelihood qualifier instead) — Epistemic Constitution #6 violation`);
    }
  }
  for (const re2 of CERTAINTY_PHRASES) {
    if (re2.test(text)) {
      found.push(`deterministic phrasing matching "${re2.source}" — Epistemic Constitution #6 violation`);
    }
  }
  return found;
}

function scanObjectForDeterminism(obj) {
  const violations = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      scanTextForDeterminism(value).forEach((v) => violations.push(`${key}: ${v}`));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'string') scanTextForDeterminism(item).forEach((v) => violations.push(`${key}[${i}]: ${v}`));
      });
    }
  }
  return violations;
}

// ---- #8/#19: shared key_assumption + evidence_sufficiency check ----
// Requires every agent to name a falsifiable assumption (#19) and to
// self-report evidence quality honestly, with confidence forced down when
// that self-report is INSUFFICIENT (#8's "variance destroys overconfidence"
// operationalised as a hard rule rather than a suggestion).
function checkAssumptionAndSufficiency(obj, confidenceField = 'confidence') {
  const violations = [];
  if (!isNonEmptyStr(obj.key_assumption)) {
    violations.push('key_assumption is missing or empty — Epistemic Constitution #19 violation');
  }
  if (!isNonEmptyStr(obj.evidence_sufficiency) || !EVIDENCE_SUFFICIENCY.includes(obj.evidence_sufficiency)) {
    violations.push(`evidence_sufficiency must be one of ${EVIDENCE_SUFFICIENCY.join('/')} — Entity Verification failed`);
  } else if (obj.evidence_sufficiency === 'INSUFFICIENT') {
    const conf = obj[confidenceField];
    if (isNum(conf) && conf > INSUFFICIENT_CONFIDENCE_CEILING) {
      violations.push(
        `evidence_sufficiency is INSUFFICIENT but ${confidenceField} is ${conf} (must be <=${INSUFFICIENT_CONFIDENCE_CEILING}) — Epistemic Constitution #8 violation: cannot claim insufficient evidence and report confident`
      );
    }
  }
  return violations;
}

export function validateDiagnostic(obj) {
  const violations = [];
  if (typeof obj !== 'object' || obj === null) return { valid: false, violations: ['Response is not a JSON object'] };
  if (!isNum(obj.risk_contribution)) violations.push('risk_contribution is not numeric');
  else if (!inRange(obj.risk_contribution, RANGE)) violations.push(`risk_contribution ${obj.risk_contribution} outside [0,100] — Functional Property violation`);
  if (!isNum(obj.confidence)) violations.push('confidence is not numeric');
  else if (!inRange(obj.confidence, RANGE)) violations.push(`confidence ${obj.confidence} outside [0,100]`);
  if (!isNonEmptyStr(obj.assessment)) violations.push('assessment is missing or empty');
  if (!isNonEmptyStr(obj.evidence)) violations.push('evidence is missing or empty');
  if (!isNonEmptyStr(obj.flag) || !FLAGS.includes(obj.flag)) violations.push(`flag must be one of ${FLAGS.join('/')} — Entity Verification failed`);
  violations.push(...checkAssumptionAndSufficiency(obj));
  violations.push(...scanObjectForDeterminism(obj));
  return { valid: violations.length === 0, violations };
}

export function validateInterpretation(obj) {
  const violations = [];
  if (typeof obj !== 'object' || obj === null) return { valid: false, violations: ['Response is not a JSON object'] };
  if (!isNum(obj.forecast_probability)) violations.push('forecast_probability is not numeric');
  else if (!inRange(obj.forecast_probability, RANGE)) violations.push(`forecast_probability ${obj.forecast_probability} outside [0,100] — Functional Property violation`);
  if (!isNum(obj.confidence)) violations.push('confidence is not numeric');
  else if (!inRange(obj.confidence, RANGE)) violations.push(`confidence ${obj.confidence} outside [0,100]`);
  if (!isNonEmptyStr(obj.case)) violations.push('case is missing or empty');
  if (!isNonEmptyStr(obj.leans_on)) violations.push('leans_on is missing or empty');
  violations.push(...checkAssumptionAndSufficiency(obj));
  violations.push(...scanObjectForDeterminism(obj));
  return { valid: violations.length === 0, violations };
}

export function validateAuditor(obj) {
  const violations = [];
  if (typeof obj !== 'object' || obj === null) return { valid: false, violations: ['Response is not a JSON object'] };
  if (!isNonEmptyStr(obj.audit_summary)) violations.push('audit_summary is missing or empty');
  if (!isNonEmptyStr(obj.data_integrity_flag) || !INTEGRITY_FLAGS.includes(obj.data_integrity_flag)) {
    violations.push(`data_integrity_flag must be one of ${INTEGRITY_FLAGS.join('/')} — Entity Verification failed`);
  }
  if (!isNum(obj.confidence)) violations.push('confidence is not numeric');
  else if (!inRange(obj.confidence, RANGE)) violations.push(`confidence ${obj.confidence} outside [0,100]`);
  if (!Array.isArray(obj.concerns)) violations.push('concerns must be an array');
  if (!Array.isArray(obj.double_counted_drivers)) violations.push('double_counted_drivers must be an array');
  violations.push(...checkAssumptionAndSufficiency(obj));
  violations.push(...scanObjectForDeterminism(obj));
  return { valid: violations.length === 0, violations };
}

export function validateCounsel(obj) {
  const violations = [];
  if (typeof obj !== 'object' || obj === null) return { valid: false, violations: ['Response is not a JSON object'] };
  if (!isNonEmptyStr(obj.case_summary)) violations.push('case_summary is missing or empty');
  if (!isNonEmptyStrArray(obj.key_evidence)) violations.push('key_evidence must be a non-empty array of strings — Functional Property violation');
  if (!isNum(obj.probability_assertion)) violations.push('probability_assertion is not numeric');
  else if (!inRange(obj.probability_assertion, RANGE)) violations.push(`probability_assertion ${obj.probability_assertion} outside [0,100]`);
  if (!isNum(obj.confidence)) violations.push('confidence is not numeric');
  else if (!inRange(obj.confidence, RANGE)) violations.push(`confidence ${obj.confidence} outside [0,100]`);
  if (!isNonEmptyStr(obj.weakest_point_conceded)) violations.push('weakest_point_conceded is missing or empty');
  violations.push(...checkAssumptionAndSufficiency(obj));
  violations.push(...scanObjectForDeterminism(obj));
  return { valid: violations.length === 0, violations };
}

export function validateJudge(obj) {
  const violations = [];
  if (typeof obj !== 'object' || obj === null) return { valid: false, violations: ['Response is not a JSON object'] };
  if (!isNum(obj.risk_score)) violations.push('risk_score is not numeric');
  else if (!inRange(obj.risk_score, RANGE)) violations.push(`risk_score ${obj.risk_score} outside [0,100] — Functional Property violation`);
  if (!isNum(obj.confidence)) violations.push('confidence is not numeric');
  else if (!inRange(obj.confidence, RANGE)) violations.push(`confidence ${obj.confidence} outside [0,100]`);
  if (!isNonEmptyStr(obj.verdict_label) || !VERDICT_LABELS.includes(obj.verdict_label)) {
    violations.push(`verdict_label must be one of ${VERDICT_LABELS.join('/')} — Entity Verification failed`);
  }
  if (!isNonEmptyStrArray(obj.drivers)) violations.push('drivers must be a non-empty array of strings');
  if (!isNonEmptyStrArray(obj.countervailing_evidence)) {
    violations.push('countervailing_evidence must be a non-empty array of strings');
  } else if (obj.countervailing_evidence.length < 2) {
    violations.push('countervailing_evidence must contain at least 2 items — Epistemic Constitution #19/#20 violation: a verdict with no genuine evidence against it has not been tested');
  }
  if (!isNonEmptyStr(obj.trigger)) violations.push('trigger is missing or empty');
  if (!isNonEmptyStr(obj.transmission_channel)) violations.push('transmission_channel is missing or empty');
  if (!isNonEmptyStrArray(obj.historical_analogues)) violations.push('historical_analogues must be a non-empty array of strings');
  if (!isNonEmptyStr(obj.disagreement)) violations.push('disagreement is missing or empty');

  // #20 — evidence beats opinion: the verdict must cite the specific input that drove it.
  if (!isNonEmptyStr(obj.primary_evidence_source)) {
    violations.push('primary_evidence_source is missing or empty — Epistemic Constitution #20 violation: must cite the specific finding that drove the verdict');
  }
  // #22 — failure/falsifiability: the verdict must say what would prove it wrong.
  if (!isNonEmptyStr(obj.falsification_condition)) {
    violations.push('falsification_condition is missing or empty — Epistemic Constitution #22 violation: must state what would falsify this conclusion');
  }
  // #26 — confidence ceiling derived from data quality, and confidence may never exceed it.
  if (!isNum(obj.confidence_ceiling)) violations.push('confidence_ceiling is not numeric — Epistemic Constitution #26 violation');
  else if (!inRange(obj.confidence_ceiling, RANGE)) violations.push(`confidence_ceiling ${obj.confidence_ceiling} outside [0,100]`);
  if (!isNonEmptyStr(obj.confidence_ceiling_rationale)) {
    violations.push('confidence_ceiling_rationale is missing or empty — must explain the data-quality basis for the ceiling');
  }
  if (isNum(obj.confidence) && isNum(obj.confidence_ceiling) && obj.confidence > obj.confidence_ceiling) {
    violations.push(
      `confidence ${obj.confidence} exceeds its own stated confidence_ceiling ${obj.confidence_ceiling} — Epistemic Constitution #26 violation: cannot be more confident than the data quality allows`
    );
  }

  violations.push(...checkAssumptionAndSufficiency(obj));
  violations.push(...scanObjectForDeterminism(obj));
  return { valid: violations.length === 0, violations };
}

export { FLAGS, INTEGRITY_FLAGS, VERDICT_LABELS, EVIDENCE_SUFFICIENCY, INSUFFICIENT_CONFIDENCE_CEILING };
