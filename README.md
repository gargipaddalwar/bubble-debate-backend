# Bubble Observatory — Debate Backend

Standalone execution layer for the dashboard's hierarchical multi-agent
panel. Everything here is plain Node/Express — no Claude-specific runtime,
no Artifact API — so it runs anywhere Node runs, which is what lets the
dashboard's debate feature work outside Claude.ai's artifact preview (as a
local file, or deployed anywhere else).

## Architecture

24 agents across 5 layers. Each layer sees a summary of every layer
**beneath** it (never its own peers, never layers above), so the hierarchy
is a real information flow:

```
Layer 1  Reality            6 agents   Data Integrity, Macro, Credit,
                                        Liquidity, Monetary Policy, Valuation
             │  (sees layer 1)
             ▼
Layer 2  Market Behaviour   5 agents   Market, Volatility, Sentiment,
                                        Behavioral, Narrative
             │  (sees layers 1-2)
             ▼
Layer 3  Systemic Risk      4 agents   Leverage, Contagion, Tail Risk,
                                        Black Swan
             │  (sees layers 1-3)
             ▼
Layer 4  Interpretation     5 agents   Bull, Bear, Contrarian,
                                        Historical Analog, Regime
             │  (sees layers 1-4)
             ▼
Layer 5  Adjudication       Model Auditor
                                 │  (reviews the whole record)
                                 ▼
                            Bubble Prosecutor ‖ Bubble Defender  (parallel)
                                 │
                                 ▼
                            Judge / Synthesis
                            → structured verdict: risk_score, confidence,
                              verdict_label, drivers, countervailing_evidence,
                              trigger, transmission_channel,
                              historical_analogues, disagreement
```

The Judge's output is the final result — it is not an average of the panel.

## Epistemic constitution

Every agent's system prompt is wrapped with a shared "epistemic
constitution" (`withConstitution()` in `src/prompts/agents.js`) derived
from this project's 26 governing principles for probabilistic reasoning
under uncertainty. Four of those principles are enforced mechanically, not
just requested in prose — an agent can't satisfy them with hedging
language alone while its structured fields still assert false certainty:

- **No deterministic language** ("will happen", "is certain", "guaranteed").
  `ontologyGuardrail.js` scans every free-text field for this and rejects
  the response, replacing it with the deterministic fallback, if found.
- **Variance lowers confidence, not just hedges it.** Every agent
  self-reports `evidence_sufficiency` (`SUFFICIENT`/`LIMITED`/`INSUFFICIENT`).
  If it reports `INSUFFICIENT`, its own `confidence` must be ≤30 — the
  guardrail rejects a response that claims weak evidence and a confident
  number in the same breath.
- **Every agent names a `key_assumption`** it could be wrong about — a
  concrete, falsifiable dependency, not a generic disclaimer.
- **The Judge's confidence has a hard, data-quality-derived ceiling.**
  The Judge reports `confidence_ceiling` (independent of its own model
  output) and `confidence` may never exceed it — checked both by the
  guardrail (on the raw LLM response) and again, independently, by
  `src/orchestrator/uncertainty.js` (`widenForDisagreement()`), which
  recomputes a confidence interval and re-caps confidence from the
  panel's *actual* spread of opinion across the Interpretation layer,
  after the Judge has spoken. High panel disagreement narrows what the
  Judge is allowed to claim regardless of what it asserts.
- **The Judge must also cite `primary_evidence_source`** (the specific
  finding that drove the verdict), a `falsification_condition` (what
  would prove it wrong), and at least 2 genuine `countervailing_evidence`
  points — a verdict the guardrail lets through with no evidence against
  it hasn't been tested hard enough.

Deterministic fallbacks (`src/orchestrator/fallbacks.js`) honestly
self-report `evidence_sufficiency: 'INSUFFICIENT'` and cap their own
confidence at 30 for the same reason a live agent would have to: a
fallback is arithmetic, not reasoning, and the system should never present
it as more confident than that.

```
frontend (bubble_dashboard.html)
        │  POST /api/debate/stream (SSE)  or  /api/debate/run (single JSON)
        ▼
server.js  ──►  src/routes/debate.js
                     ▼
              src/orchestrator/debateOrchestrator.js  (layer loop, adjudication)
                     │              │                    │
                     ▼              ▼                    ▼
     src/orchestrator/llmClient.js   src/validation/       src/orchestrator/
     (holds ANTHROPIC_API_KEY,       ontologyGuardrail.js  fallbacks.js
      calls Anthropic Messages API)  (one validator per     (deterministic,
                     │               agent shape)            clearly-labelled
              src/prompts/agents.js                          fallback per
              (24 agents + adjudication                      agent shape)
               roles, prompt builders —
               add agents here)
```

Every agent response is validated against the ontology guardrail before it's
used. A response that fails validation, or an agent call that fails outright
(network error, missing API key), is replaced by its deterministic fallback
— clearly labelled `(Deterministic fallback)` in the text — rather than
failing silently or fabricating a result.

## Local setup

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm start               # listens on :8787
```

Test it directly:
```bash
curl -X POST http://localhost:8787/api/debate/run \
  -H "Content-Type: application/json" \
  -d '{"ctx":{"country":"United States","horizon":4,"riskIndex":"52.0","regime":"Medium","burstProb":"38.2","bubblePhase":"not currently in build-up","topDrivers":["Credit gap (+0.3)"],"dominantSector":"Credit & consumer lending (61/100)","backtest":"14 signals, 3 hits, 21% hit-rate"}}'
```

Without `ANTHROPIC_API_KEY` set, every agent automatically runs on its
deterministic fallback — useful for testing the full pipeline (and the
dashboard against it) with no API costs.

## Frontend integration

Already wired into `bubble_dashboard.html` directly (no patch file needed —
its debate engine calls this backend's `/api/debate/stream` over SSE, and
falls back to a fully local, backend-free deterministic simulation of all
24 agents if this server is unreachable). Point the dashboard at a deployed
instance of this backend by setting `window.DEBATE_BACKEND_URL` before the
dashboard's script runs (default is `http://localhost:8787`).

## Deploying

Works identically on any Node host. Set `ANTHROPIC_API_KEY` and
`ALLOWED_ORIGINS` (your frontend's deployed URL) as environment variables.

- **Vercel**: deploy as a Serverless Function (wrap `server.js`'s routes as
  an API route) or use their Node server runtime.
- **Railway / Render / Fly.io**: point at this repo, they auto-detect
  `npm start`. Set env vars in their dashboard.
- **AWS / Azure / GCP**: run as a container (add a `Dockerfile` — trivial,
  `FROM node:20-alpine`, copy, `npm ci`, `CMD ["node","server.js"]`) on
  ECS/App Runner, Azure App Service, or Cloud Run.

No code changes needed between platforms — this is a standard Express app.

## Extending

- **More agents in an existing layer**: add an entry to that layer's
  `agents` array in `src/prompts/agents.js` — the orchestrator, validation,
  and fallback logic all pick it up automatically (they iterate the array,
  nothing is hardcoded per-agent).
- **A new layer**: add an entry to the `LAYERS` array in
  `src/prompts/agents.js` with a `key`, `title`, and `agents` list; the
  orchestrator's layer loop iterates `LAYERS` directly. Diagnostic layers
  (Reality-style: `risk_contribution`/`confidence`/`flag`) use
  `diagnosticPrompt`/`validateDiagnostic`/`fallbackDiagnostic`; a layer
  meant to forecast (Interpretation-style) uses the `interpretation*`
  equivalents.
- **Different provider**: `src/orchestrator/llmClient.js` is the only file
  that talks to Anthropic — swap its internals for another provider's API
  and nothing else in the orchestrator needs to change.
- **Tools/retrieval**: add a step in `debateOrchestrator.js` before
  `callLLM()` per agent; the layer loop and validation layer don't need to
  know about it.
