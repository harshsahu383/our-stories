import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import api from './routes/api.js';
import { prisma } from './config/prisma.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }), api);
app.use((err, _req, res, _next) => {
  console.error('[api-error]', err);
  const status = err.status || (err.name === 'ZodError' ? 400 : 500);
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
});
if (process.env.NODE_ENV === 'production' && (process.env.STORAGE_DRIVER || 'local') !== 's3') {
  throw new Error('Production requires private S3-compatible audio storage.');
}
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => console.log(`Our Stories API listening on :${port}`));
const shutdown = async () => { server.close(); await prisma.$disconnect(); process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
