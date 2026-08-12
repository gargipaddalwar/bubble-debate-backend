// src/routes/debate.js
import express from 'express';
import { runDebate } from '../orchestrator/debateOrchestrator.js';

export const debateRouter = express.Router();

function sseWrite(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * POST /api/debate/stream
 * Body: { ctx: {...} }
 * Streams Server-Sent Events as the 5-layer panel progresses, then closes.
 */
debateRouter.post('/stream', async (req, res) => {
  const { ctx } = req.body || {};
  if (!ctx || typeof ctx !== 'object') {
    res.status(400).json({ error: 'Missing required "ctx" object in request body.' });
    return;
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  const onEvent = (event) => sseWrite(res, event);

  try {
    await runDebate(ctx, {}, onEvent);
  } catch (err) {
    sseWrite(res, { type: 'error', message: String(err.message || err) });
  } finally {
    res.end();
  }
});

/**
 * POST /api/debate/run
 * Non-streaming fallback: same orchestration, single JSON response at the end.
 */
debateRouter.post('/run', async (req, res) => {
  const { ctx } = req.body || {};
  if (!ctx || typeof ctx !== 'object') {
    res.status(400).json({ error: 'Missing required "ctx" object in request body.' });
    return;
  }
  try {
    const result = await runDebate(ctx, {}, () => {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});
