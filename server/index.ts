import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import parseRouter from './routes/parse.js';
import classifyRouter from './routes/classify.js';
import analyzeRouter from './routes/analyze.js';
import rulesRouter from './routes/rules.js';
import summarizeRouter from './routes/summarize.js';
import correctRouter from './routes/correct.js';
import chatRouter from './routes/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const isProd = process.env.NODE_ENV === 'production';

const app = express();

app.use(cors({ origin: isProd ? false : 'http://localhost:5173' }));
app.use(express.json({ limit: '5mb' }));

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use('/api/parse', parseRouter);
app.use('/api/classify', classifyRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/summarize', summarizeRouter);
app.use('/api/correct', correctRouter);
app.use('/api/chat', chatRouter);

// In production, serve the Vite build from dist/
if (isProd) {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`QuoteLens API server running on http://localhost:${PORT}`);
  if (!isProd) {
    console.log('  POST /api/parse    — document extraction');
    console.log('  POST /api/classify — canonical classification');
    console.log('  GET  /api/health   — health check');
  }
});
