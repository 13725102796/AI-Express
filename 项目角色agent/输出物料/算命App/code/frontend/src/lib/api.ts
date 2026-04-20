/**
 * Backend API client for fortune-telling services.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface FortuneStartPayload {
  baziData: {
    yearPillar: { stem: string; branch: string; element: string };
    monthPillar: { stem: string; branch: string; element: string };
    dayPillar: { stem: string; branch: string; element: string };
    hourPillar: { stem: string; branch: string; element: string } | null;
    fiveElements: { metal: number; wood: number; water: number; fire: number; earth: number };
    summary: string;
  };
  gender?: 'male' | 'female' | null;
}

export interface FortuneChatPayload {
  message: string;
  baziData: FortuneStartPayload['baziData'];
  history: { role: 'user' | 'assistant'; content: string }[];
  round: number;
}

/**
 * Parse SSE stream and yield parsed data events.
 */
async function* parseSSEStream(
  response: Response
): AsyncGenerator<{ type: string; content?: string; message?: string }> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          yield JSON.parse(data);
        } catch {
          // Skip unparseable lines
        }
      }
    }
  }
}

/**
 * Start fortune analysis with SSE streaming.
 * Yields content chunks for typewriter effect,
 * then yields the complete parsed fortune data.
 */
export async function* streamFortuneStart(
  payload: FortuneStartPayload
): AsyncGenerator<{ type: string; content?: string; message?: string }> {
  const response = await fetch(`${API_BASE}/api/fortune/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  yield* parseSSEStream(response);
}

/**
 * Chat follow-up with SSE streaming.
 * Yields content chunks for typewriter effect.
 */
export async function* streamFortuneChat(
  payload: FortuneChatPayload
): AsyncGenerator<{ type: string; content?: string; message?: string }> {
  const response = await fetch(`${API_BASE}/api/fortune/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  yield* parseSSEStream(response);
}

/**
 * Health check.
 */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/api/health`);
  return response.json();
}
