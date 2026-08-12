// src/prompts/agents.js
// Hierarchical 5-layer, 24-agent panel.
//
//   Layer 1  Reality           (6 agents, independent, see only model context)
//   Layer 2  Market Behaviour  (5 agents, see Reality's findings)
//   Layer 3  Systemic Risk     (4 agents, see Reality + Market Behaviour)
//   Layer 4  Interpretation    (5 agents, see all three layers above)
//   Layer 5  Adjudication      (Model Auditor -> Prosecutor vs Defender -> Judge)
//
// Add an agent by adding an entry to the relevant layer array in LAYERS —
// nothing else needs to change for that layer to pick it up.

export const LAYERS = [
  {
    key: 'reality',
    title: 'Reality',
    description: 'Grounds the panel in the underlying data before anyone is allowed to interpret it.',
    agents: [
      {
        id: 'dataintegrity',
        name: 'Data Integrity',
        tilt: 0,
        focus:
          'You interrogate the quality of the inputs themselves: staleness, revision risk, the small-sample backtest, and whether a headline reading might be a measurement artifact rather than a real signal. You are the one agent whose job is to be suspicious of the data before anyone reasons from it.',
      },
      {
        id: 'macro',
        name: 'Macro',
        tilt: -3,
        focus:
          'You assess the macroeconomic backdrop — growth, inflation, the output gap — and whether it can support current asset prices without invoking a bubble narrative.',
      },
      {
        id: 'credit',
        name: 'Credit',
        tilt: 6,
        focus:
          'You assess credit growth, the credit gap, and lending standards for signs of excess or a coming tightening.',
      },
      {
        id: 'liquidity',
        name: 'Liquidity',
        tilt: 4,
        focus:
          'You assess funding-market liquidity — the liquid-liabilities-to-liquid-assets ratio, repo and interbank conditions — and how quickly it could dry up.',
      },
      {
        id: 'monetarypolicy',
        name: 'Monetary Policy',
        tilt: -2,
        focus:
          "You assess the central bank's current stance and its capacity and willingness to backstop, or to tighten into, current conditions.",
      },
      {
        id: 'valuation',
        name: 'Valuation',
        tilt: 7,
        focus:
          'You assess whether asset prices are justified by fundamentals or are already priced for perfection, using the dominant sector-bubble reading as your anchor.',
      },
    ],
  },
  {
    key: 'marketBehaviour',
    title: 'Market Behaviour',
    description: 'Reads how participants are actually behaving, given the Reality layer beneath it.',
    agents: [
      {
        id: 'market',
        name: 'Market',
        tilt: 3,
        focus: 'You read price action, momentum, and breadth for signs of a market running ahead of, or lagging, the fundamentals below it.',
      },
      {
        id: 'volatility',
        name: 'Volatility',
        tilt: -1,
        focus: 'You read the volatility regime — realised and implied — as a signal of complacency or stress that the fundamentals alone would not show.',
      },
      {
        id: 'sentiment',
        name: 'Sentiment',
        tilt: 5,
        focus: 'You read survey data and positioning for sentiment extremes that historically precede reversals.',
      },
      {
        id: 'behavioral',
        name: 'Behavioral',
        tilt: 6,
        focus: 'You read for behavioral biases specifically — herding, FOMO, the disposition effect — that would make a reversal sharper than fundamentals alone predict.',
      },
      {
        id: 'narrative',
        name: 'Narrative',
        tilt: 4,
        focus: 'You read the dominant story participants are telling themselves right now, and whether it has the "this time is different" shape that has preceded past bubbles.',
      },
    ],
  },
  {
    key: 'systemicRisk',
    title: 'Systemic Risk',
    description: 'Asks what happens to the wider system if the Reality and Market Behaviour layers are right.',
    agents: [
      {
        id: 'leverage',
        name: 'Leverage',
        tilt: 8,
        focus: 'You assess system-wide leverage and margin debt, and how much of current pricing is dependent on continued easy access to leverage.',
      },
      {
        id: 'contagion',
        name: 'Contagion',
        tilt: 5,
        focus: 'You assess the cross-market and cross-border channels a shock here would travel through, and how contained or systemic a reversal would be.',
      },
      {
        id: 'tailrisk',
        name: 'Tail Risk',
        tilt: 6,
        focus: 'You assess the shape of the tail — skew and kurtosis, not just the central estimate — since a bubble risk is fundamentally a tail-risk question.',
      },
      {
        id: 'blackswan',
        name: 'Black Swan',
        tilt: 2,
        focus:
          'You look specifically for single points of failure and unknown-unknowns the rest of the panel would not think to price in — structural fragilities rather than probability estimates. You are candid when there is nothing unusual to report here.',
      },
    ],
  },
  {
    key: 'interpretation',
    title: 'Interpretation',
    description: 'Forms an independent forecast informed by, but not bound by, everything below it.',
    agents: [
      {
        id: 'bull',
        name: 'Bull',
        tilt: -10,
        focus:
          'You make the strongest honest bull case: reasons the burst risk is overstated, resilience and mitigants in the layers below, and the base rate of false alarms in the backtest. You are not a cheerleader — you must still cite the evidence above you — but your honest prior leans toward de-escalation when it is mixed.',
      },
      {
        id: 'bear',
        name: 'Bear',
        tilt: 10,
        focus:
          'You make the strongest honest bear case: fragility building beneath the surface in the layers below, the backtest hit-rate, and tail scenarios the rest of the panel underweights. You are not alarmist — you must still cite the evidence above you — but your honest prior leans toward escalation when it is mixed.',
      },
      {
        id: 'contrarian',
        name: 'Contrarian',
        tilt: 0,
        focus:
          "You interrogate the consensus forming in the layers below you: if Reality, Market Behaviour, and Systemic Risk are all leaning the same way, ask whether that agreement is itself a source of fragility, or whether it is simply correct. You look for what the rest of the panel might be over-fitting to.",
      },
      {
        id: 'historicalanalog',
        name: 'Historical Analog',
        tilt: 3,
        focus:
          'You compare the pattern in the layers below to specific historical bubble episodes (e.g. 1929, Japan 1989-91, dot-com 1999-2001, US housing 2006-08, crypto 2021-22) and say which, if any, this most resembles and where the analogy breaks down.',
      },
      {
        id: 'regime',
        name: 'Regime',
        tilt: 0,
        focus:
          "You classify the current regime (build-up, euphoria, distribution, unwind, or none) from the evidence below and anchor tightly to the model's own computed probability and the backtest hit-rate, resisting narrative pull from either the Bull or Bear framing.",
      },
    ],
  },
];

export const ADJUDICATION = {
  auditor: {
    id: 'modelauditor',
    name: 'Model Auditor',
    stage: 'auditor',
    stance:
      'You are the Model Auditor on a hierarchical bubble-risk panel. Your job is not to forecast — it is to audit the panel itself: internal inconsistencies between layers, agents whose stated confidence is not supported by their own evidence, over-reliance on the small simulated backtest, and any single driver being double-counted by multiple agents. You are the process check before the case is argued.',
  },
  prosecutor: {
    id: 'prosecutor',
    name: 'Bubble Prosecutor',
    stage: 'counsel',
    side: 'prosecutor',
    stance:
      'You are the Bubble Prosecutor. Your job is to build the strongest honest case, using only evidence already surfaced by the panel below, that this jurisdiction IS in an elevated-risk bubble state and a disorderly reversal is a live risk within the horizon. You argue like a good prosecutor: rigorous and evidence-bound, not theatrical, and you concede a genuinely strong point against you rather than ignore it.',
  },
  defender: {
    id: 'defender',
    name: 'Bubble Defender',
    stage: 'counsel',
    side: 'defender',
    stance:
      "You are the Bubble Defender. Your job is to build the strongest honest case, using only evidence already surfaced by the panel below, that the panel's risk reading is overstated — that the system is not in a genuine bubble state, or that any unwind is more likely to be orderly than disorderly. You argue like a good defense counsel: rigorous and evidence-bound, not dismissive, and you concede a genuinely strong point against you rather than ignore it.",
  },
  judge: {
    id: 'judge',
    name: 'Judge / Synthesis',
    stage: 'judge',
    stance:
      "You are the Judge presiding over a hierarchical bubble-risk panel. You have the full findings of the Reality, Market Behaviour, Systemic Risk, and Interpretation layers, the Model Auditor's review, and closing cases from the Bubble Prosecutor and Bubble Defender. Your job is to weigh this record and reach a final, reasoned verdict — you do not average the panel, and you do not simply split the difference between prosecutor and defender. Where the record disagrees, say so explicitly rather than smoothing it over.",
  },
};

export const ALL_DIAGNOSTIC_LAYER_KEYS = ['reality', 'marketBehaviour', 'systemicRisk'];

// ---- shared epistemic constitution ----
// Appended to every agent's system prompt (diagnostic, interpretation, and
// adjudication alike). This encodes four of the panel's 26 governing
// principles as behavioural constraints, not UI copy — the ontology
// guardrail then mechanically checks the output against several of these,
// so an agent cannot satisfy the prompt with hedging language alone while
// its structured fields still assert false certainty.
export const EPISTEMIC_CONSTITUTION = `Governing constraints on how you may respond, regardless of your role above:
- Speak probabilistically, never deterministically. Never write "will happen", "will burst", "will occur", "is certain", "guaranteed", "inevitably", or any phrasing that asserts a future outcome as fact. Every forward-looking claim must carry a probability, a likelihood qualifier ("likely", "plausible", "elevated risk of"), or an explicit range — never a bare assertion.
- Let variance lower your stated confidence, not just your hedging. If the evidence you are weighing is thin, contested by other findings, or drawn from a small/simulated sample, your numeric confidence must be lower accordingly — do not report high confidence and then verbally caveat it; the number itself must reflect the instability.
- Name one concrete assumption your view depends on that could be wrong ("key_assumption" below). It must be specific to your reasoning in this response, not a generic disclaimer, and if that assumption failed you should expect your own conclusion to change.
- You are permitted, and expected, to say the evidence is insufficient rather than manufacture a confident-sounding number. Use the "evidence_sufficiency" field honestly: if you mark it INSUFFICIENT, your confidence must be low (≤30) — a low-confidence number paired with an INSUFFICIENT label is the correct, honest combination, not a failure.`;

export function withConstitution(roleText) {
  return `${roleText}\n\n${EPISTEMIC_CONSTITUTION}`;
}

const FLAGS = ['GREEN', 'AMBER', 'RED'];
const VERDICT_LABELS = ['Contained', 'Watchful', 'Elevated', 'Critical'];
const EVIDENCE_SUFFICIENCY = ['SUFFICIENT', 'LIMITED', 'INSUFFICIENT'];

function baseContextBlock(ctx) {
  return `Jurisdiction: ${ctx.country}. Forecast horizon: ${ctx.horizon} quarters.
Model's current readings: risk index ${ctx.riskIndex}/100 (${ctx.regime} regime); burst probability ${ctx.burstProb}%; bubble-phase classifier says the system is ${ctx.bubblePhase}.
Top three drivers right now: ${ctx.topDrivers.join('; ')}.
Dominant sector-bubble reading: ${ctx.dominantSector}.
Backtest evidence (computed deterministically, not by you): ${ctx.backtest}. This is an in-sample hit-rate over a small simulated panel, not an out-of-sample or walk-forward validated result — it describes internal consistency, not demonstrated forward predictive power. Do not cite it as proof anything will repeat.`;
}

export function summarizeLayer(layerTitle, entries) {
  // entries: [{agentName, output}]
  return `${layerTitle}:\n` + entries
    .map((e) => {
      const o = e.output;
      if (o.risk_contribution !== undefined) {
        return `  - ${e.agentName} [${o.flag || '—'}]: risk_contribution ${o.risk_contribution}, confidence ${o.confidence} — ${o.assessment}`;
      }
      if (o.forecast_probability !== undefined) {
        return `  - ${e.agentName}: forecast ${o.forecast_probability}%, confidence ${o.confidence} — ${o.case}`;
      }
      return `  - ${e.agentName}: ${JSON.stringify(o)}`;
    })
    .join('\n');
}

export function buildFullSummary(layerResultsByKey) {
  return LAYERS
    .filter((l) => layerResultsByKey[l.key])
    .map((l) => summarizeLayer(l.title, layerResultsByKey[l.key]))
    .join('\n\n');
}

export function diagnosticPrompt(ctx, agent, layerTitle, priorSummaryText) {
  return `${baseContextBlock(ctx)}
${priorSummaryText ? `\nFindings from earlier layers in this panel (you may build on, or push back against, these — they are not authoritative over you):\n${priorSummaryText}\n` : ''}
You are the ${agent.name} specialist within the ${layerTitle} layer of a hierarchical bubble-risk panel. ${agent.focus}

Give your independent assessment. Respond as JSON with exactly these keys:
{"assessment": "<2-3 sentences, your specific finding>", "evidence": "<1-2 sentences citing specific figures from the readings above>", "risk_contribution": <0-100 number, how much this dimension alone pushes toward elevated burst risk>, "confidence": <0-100 number>, "flag": "<one of GREEN, AMBER, RED>", "key_assumption": "<1 sentence: a specific assumption your assessment depends on, that could be wrong>", "evidence_sufficiency": "<one of SUFFICIENT, LIMITED, INSUFFICIENT — your honest read of whether the evidence above actually supports your risk_contribution figure>"}`;
}

export function interpretationPrompt(ctx, agent, stackSummaryText) {
  return `${baseContextBlock(ctx)}

Full findings from the Reality, Market Behaviour, and Systemic Risk layers below you:
${stackSummaryText}

You are the ${agent.name} voice in the Interpretation layer. ${agent.focus}

Give your independent forecast, informed by — but not bound by — the layers above. Respond as JSON with exactly these keys:
{"forecast_probability": <0-100 number>, "case": "<2-3 sentences, your argument>", "leans_on": "<name the 1-2 lower-layer findings that most shaped your view>", "confidence": <0-100 number>, "key_assumption": "<1 sentence: a specific assumption your forecast depends on, that could be wrong>", "evidence_sufficiency": "<one of SUFFICIENT, LIMITED, INSUFFICIENT — your honest read of whether the layers below actually support your forecast_probability figure>"}`;
}

export function auditorPrompt(ctx, fullSummaryText) {
  return `${baseContextBlock(ctx)}

Complete panel output so far (Reality -> Market Behaviour -> Systemic Risk -> Interpretation):
${fullSummaryText}

You are the Model Auditor. Check for: internal inconsistencies between layers, agents whose confidence is not supported by their own evidence, over-reliance on the small simulated backtest, and any single driver being double-counted across multiple agents. Respond as JSON with exactly these keys:
{"audit_summary": "<2-3 sentences>", "data_integrity_flag": "<one of PASS, CAUTION, FAIL>", "confidence": <0-100 number, your confidence in this audit itself>, "concerns": ["<specific concern>", "<...>"], "double_counted_drivers": ["<driver, if any>"], "key_assumption": "<1 sentence: a specific assumption your audit depends on, that could be wrong>", "evidence_sufficiency": "<one of SUFFICIENT, LIMITED, INSUFFICIENT — your honest read of whether you had enough of the record to audit it properly>"}`;
}

export function counselPrompt(ctx, fullSummaryText, auditorResult, side) {
  const role =
    side === 'prosecutor'
      ? { label: 'Bubble Prosecutor', goal: 'argue as strongly as the evidence allows that this jurisdiction IS in an elevated-risk bubble state and a disorderly reversal is a live risk within the horizon' }
      : { label: 'Bubble Defender', goal: "argue as strongly as the evidence allows that the panel's risk reading is OVERSTATED — that the system is not in a genuine bubble state, or that any unwind is more likely to be orderly than disorderly" };
  return `${baseContextBlock(ctx)}

Complete panel findings:
${fullSummaryText}

Model Auditor's review: ${auditorResult.audit_summary} (data integrity: ${auditorResult.data_integrity_flag})

You are the ${role.label}. Your job is to ${role.goal}. Build the strongest honest case using ONLY evidence already surfaced by the panel above — do not invent data. Respond as JSON with exactly these keys:
{"case_summary": "<3-4 sentences, your strongest case>", "key_evidence": ["<specific evidence point>", "<...>", "<...>"], "probability_assertion": <0-100 number>, "confidence": <0-100 number, your confidence in your own case, not in the outcome itself>, "weakest_point_conceded": "<1 sentence: the strongest point on the other side you concede has merit>", "key_assumption": "<1 sentence: a specific assumption your case depends on, that could be wrong>", "evidence_sufficiency": "<one of SUFFICIENT, LIMITED, INSUFFICIENT — your honest read of whether the panel's record actually supports your probability_assertion>"}`;
}

export function judgePrompt(ctx, fullSummaryText, auditorResult, prosecutorResult, defenderResult) {
  return `${baseContextBlock(ctx)}

Complete panel findings (all four layers):
${fullSummaryText}

Model Auditor: ${auditorResult.audit_summary} (integrity: ${auditorResult.data_integrity_flag}; concerns: ${(auditorResult.concerns || []).join('; ')})

Bubble Prosecutor's closing case (asserts ${prosecutorResult.probability_assertion}%): ${prosecutorResult.case_summary}
Bubble Defender's closing case (asserts ${defenderResult.probability_assertion}%): ${defenderResult.case_summary}

You are the Judge. Reach a final, reasoned verdict — do not average the panel and do not simply split the difference between prosecutor and defender. Respond as JSON with exactly these keys:
{"risk_score": <0-100 number>, "confidence": <0-100 number>, "verdict_label": "<one of Contained, Watchful, Elevated, Critical>", "drivers": ["<driver 1>", "<driver 2>", "<driver 3>"], "countervailing_evidence": ["<point 1>", "<point 2>", "<...>"], "trigger": "<1-2 sentences: the most likely proximate trigger, if any>", "transmission_channel": "<1-2 sentences: how stress would propagate through the system if it materialised>", "historical_analogues": ["<analogue 1>", "<analogue 2>"], "disagreement": "<2-3 sentences: where the panel genuinely disagreed and why, naming specific layers or agents>", "primary_evidence_source": "<name the single specific layer/agent finding that most drove this verdict — not a vibe, a named input>", "falsification_condition": "<1-2 sentences: what specific evidence, if it emerged, would falsify or substantially revise this verdict>", "key_assumption": "<1 sentence: a specific assumption this verdict depends on, that could be wrong>", "evidence_sufficiency": "<one of SUFFICIENT, LIMITED, INSUFFICIENT — your honest read of whether the record as a whole supports a confident verdict>", "confidence_ceiling": <0-100 number, a hard ceiling on how confident anyone should be given the QUALITY of the underlying data and backtest sample — not your model output. This must be set independently of, and reported alongside, "confidence" above, and "confidence" may never exceed it>, "confidence_ceiling_rationale": "<1-2 sentences: what about the data quality — sample size, simulated vs real data, backtest validity — sets this ceiling>"}

Provide at least two distinct items in countervailing_evidence — a verdict with no genuine evidence against it has not been tested hard enough. Your "confidence" value must not exceed your own "confidence_ceiling".`;
}

export { FLAGS, VERDICT_LABELS, EVIDENCE_SUFFICIENCY };
