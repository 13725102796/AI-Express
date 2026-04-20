import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import fortune from './routes/fortune.js';
import health from './routes/health.js';
import { rateLimit } from './middleware/rateLimit.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    exposeHeaders: ['Content-Type'],
    maxAge: 3600,
  })
);

// Rate limiting on fortune endpoints
app.use('/api/fortune/*', rateLimit(10, 60 * 1000));

// Routes
app.route('/api/fortune', fortune);
app.route('/api/health', health);

// Root
app.get('/', (c) => {
  return c.json({ message: '天机 AI 算命 - Backend API', version: '1.0.0' });
});

// Start server
const port = parseInt(process.env.PORT || '3001', 10);

console.log(`
  ╔══════════════════════════════════╗
  ║   天机 AI 算命 - Backend API     ║
  ║   Running on port ${port}          ║
  ╚══════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
