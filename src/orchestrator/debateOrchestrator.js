// src/orchestrator/debateOrchestrator.js
// Runs the full 5-layer hierarchical panel server-side:
//
//   Reality (6) -> Market Behaviour (5) -> Systemic Risk (4) -> Interpretation (5)
//   -> Model Auditor -> Bubble Prosecutor || Bubble Defender -> Judge / Synthesis
//
// Every layer's agents run in parallel; each layer is given the summarised
// findings of every layer beneath it (never above it, and never its own
// peers) so the hierarchy is a real information flow, not cosmetic
// grouping. The final output is the Judge's structured verdict, not an
// average of the panel.

import {
  LAYERS,
  ADJUDICATION,
  summarizeLayer,
  buildFullSummary,
  diagnosticPrompt,
  interpretationPrompt,
  auditorPrompt,
  counselPrompt,
  judgePrompt,
  withConstitution,
} from '../prompts/agents.js';
import { callLLM } from './llmClient.js';
import {
  validateDiagnostic,
  validateInterpretation,
  validateAuditor,
  validateCounsel,
  validateJudge,
} from '../validation/ontologyGuardrail.js';
import {
  fallbackDiagnostic,
  fallbackInterpretation,
  fallbackAuditor,
  fallbackCounsel,
  fallbackJudge,
} from './fallbacks.js';
import { widenForDisagreement } from './uncertainty.js';

/**
 * @param {object} ctx - market/model context (same shape the frontend already builds)
 * @param {object} opts - reserved for future use (e.g. selecting a subset of layers)
 * @param {(event: object) => void} onEvent - called for every state change, for SSE streaming
 */
export async function runDebate(ctx, opts = {}, onEvent = () => {}) {
  const ledger = [];
  const log = (agentName, stage, result, detail) => {
    const entry = { agentName, stage, result, detail, t: new Date().toISOString() };
    ledger.push(entry);
    onEvent({ type: 'ledger', entry });
  };

  let apiHealthy = true;
  const seedText = `${ctx.country}-${ctx.horizon}`;
  const layerResultsByKey = {};

  // ---- Layers 1-3: diagnostic layers (Reality, Market Behaviour, Systemic Risk) ----
  // ---- Layer 4: interpretation layer ----
  for (const layer of LAYERS) {
    onEvent({ type: 'layer-start', layer: layer.key, title: layer.title });
    const isInterpretation = layer.key === 'interpretation';
    const priorSummary = buildFullSummary(layerResultsByKey); // everything strictly below this layer

    const entries = await Promise.all(
      layer.agents.map(async (agent) => {
        onEvent({ type: 'agent-status', layer: layer.key, agentId: agent.id, status: 'working' });
        let result;
        try {
          if (!apiHealthy) throw new Error('api-unavailable');
          let raw;
          try {
            const prompt = isInterpretation
              ? interpretationPrompt(ctx, agent, priorSummary)
              : diagnosticPrompt(ctx, agent, layer.title, priorSummary);
            raw = await callLLM(
              withConstitution(`You are one voice on a hierarchical bubble-risk panel. ${agent.focus}`),
              prompt
            );
          } catch (networkErr) {
            apiHealthy = false;
            throw networkErr;
          }
          const check = isInterpretation ? validateInterpretation(raw) : validateDiagnostic(raw);
          if (!check.valid) {
            log(agent.name, layer.title, 'REJECTED', check.violations.join('; '));
            result = isInterpretation
              ? fallbackInterpretation(agent, ctx, seedText)
              : fallbackDiagnostic(agent, layer.title, ctx, seedText);
          } else {
            log(agent.name, layer.title, 'VALIDATED', 'All required fields present and within domain constraints.');
            result = raw;
          }
        } catch (err) {
          result = isInterpretation
            ? fallbackInterpretation(agent, ctx, seedText)
            : fallbackDiagnostic(agent, layer.title, ctx, seedText);
        }
        onEvent({ type: 'agent-result', layer: layer.key, agentId: agent.id, agentName: agent.name, result });
        onEvent({ type: 'agent-status', layer: layer.key, agentId: agent.id, status: 'done' });
        return { agentId: agent.id, agentName: agent.name, output: result };
      })
    );

    layerResultsByKey[layer.key] = entries;
    onEvent({ type: 'layer-done', layer: layer.key, entries });
  }

  const fullSummary = buildFullSummary(layerResultsByKey);

  // ---- Layer 5a: Model Auditor ----
  onEvent({ type: 'layer-start', layer: 'auditor', title: 'Model Auditor' });
  onEvent({ type: 'agent-status', layer: 'auditor', agentId: ADJUDICATION.auditor.id, status: 'working' });
  let auditorResult;
  try {
    if (!apiHealthy) throw new Error('api-unavailable');
    let raw;
    try {
      raw = await callLLM(withConstitution(ADJUDICATION.auditor.stance), auditorPrompt(ctx, fullSummary));
    } catch (networkErr) {
      apiHealthy = false;
      throw networkErr;
    }
    const check = validateAuditor(raw);
    if (!check.valid) {
      log(ADJUDICATION.auditor.name, 'Adjudication', 'REJECTED', check.violations.join('; '));
      auditorResult = fallbackAuditor(ctx);
    } else {
      log(ADJUDICATION.auditor.name, 'Adjudication', 'VALIDATED', 'Audit fields present and well-formed.');
      auditorResult = raw;
    }
  } catch (err) {
    auditorResult = fallbackAuditor(ctx);
  }
  onEvent({ type: 'auditor-result', result: auditorResult });
  onEvent({ type: 'agent-status', layer: 'auditor', agentId: ADJUDICATION.auditor.id, status: 'done' });

  // ---- Layer 5b: Bubble Prosecutor vs Bubble Defender (parallel) ----
  onEvent({ type: 'layer-start', layer: 'counsel', title: 'Prosecutor vs Defender' });
  const counselResults = {};
  await Promise.all(
    ['prosecutor', 'defender'].map(async (side) => {
      const agent = ADJUDICATION[side];
      onEvent({ type: 'agent-status', layer: 'counsel', agentId: agent.id, status: 'working' });
      let result;
      try {
        if (!apiHealthy) throw new Error('api-unavailable');
        let raw;
        try {
          raw = await callLLM(withConstitution(agent.stance), counselPrompt(ctx, fullSummary, auditorResult, side));
        } catch (networkErr) {
          apiHealthy = false;
          throw networkErr;
        }
        const check = validateCounsel(raw);
        if (!check.valid) {
          log(agent.name, 'Adjudication', 'REJECTED', check.violations.join('; '));
          result = fallbackCounsel(side, ctx);
        } else {
          log(agent.name, 'Adjudication', 'VALIDATED', 'Case fields present and within domain constraints.');
          result = raw;
        }
      } catch (err) {
        result = fallbackCounsel(side, ctx);
      }
      counselResults[side] = result;
      onEvent({ type: 'counsel-result', side, agentId: agent.id, agentName: agent.name, result });
      onEvent({ type: 'agent-status', layer: 'counsel', agentId: agent.id, status: 'done' });
    })
  );

  // ---- Layer 5c: Judge / Synthesis ----
  onEvent({ type: 'layer-start', layer: 'judge', title: 'Judge / Synthesis' });
  onEvent({ type: 'agent-status', layer: 'judge', agentId: ADJUDICATION.judge.id, status: 'working' });
  let verdict;
  try {
    if (!apiHealthy) throw new Error('api-unavailable');
    let raw;
    try {
      raw = await callLLM(
        withConstitution(ADJUDICATION.judge.stance),
        judgePrompt(ctx, fullSummary, auditorResult, counselResults.prosecutor, counselResults.defender)
      );
    } catch (networkErr) {
      apiHealthy = false;
      throw networkErr;
    }
    const check = validateJudge(raw);
    if (!check.valid) {
      log(ADJUDICATION.judge.name, 'Adjudication', 'REJECTED', check.violations.join('; '));
      verdict = fallbackJudge(ctx, layerResultsByKey, auditorResult, counselResults.prosecutor, counselResults.defender);
    } else {
      log(ADJUDICATION.judge.name, 'Adjudication', 'VALIDATED', 'Verdict fields present and within domain constraints.');
      verdict = raw;
    }
  } catch (err) {
    verdict = fallbackJudge(ctx, layerResultsByKey, auditorResult, counselResults.prosecutor, counselResults.defender);
  }

  // Principle #8, enforced as arithmetic rather than trusted to the
  // Judge's own prose: recompute a confidence interval and cap the
  // reported confidence from the panel's ACTUAL spread of opinion, on
  // both the live and fallback verdict path, so real disagreement between
  // agents can never simply be averaged away.
  verdict = widenForDisagreement(verdict, layerResultsByKey);

  onEvent({ type: 'verdict', verdict, apiHealthy });
  onEvent({ type: 'agent-status', layer: 'judge', agentId: ADJUDICATION.judge.id, status: 'done' });

  onEvent({ type: 'done', apiHealthy, ledger });

  return {
    layers: layerResultsByKey,
    auditor: auditorResult,
    prosecutor: counselResults.prosecutor,
    defender: counselResults.defender,
    verdict,
    ledger,
    apiHealthy,
  };
}
