// server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { debateRouter } from './src/routes/debate.js';

const app = express();
const PORT = process.env.PORT || 8787;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'bubble-debate-backend' }));

app.use('/api/debate', debateRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`bubble-debate-backend listening on :${PORT}`);
});
