import { describe, it, expect } from 'vitest';
import app from '../src/index.js';

describe('Health endpoint', () => {
  it('GET /api/health should return ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('tianji-backend');
    expect(body.timestamp).toBeDefined();
  });

  it('GET / should return service info', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('天机');
    expect(body.version).toBe('1.0.0');
  });
});
