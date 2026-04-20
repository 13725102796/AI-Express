import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { streamChat } from '../services/llm.js';
import { SYSTEM_PROMPT, buildFirstAnalysisPrompt, buildChatPrompt } from '../services/prompt.js';
import { FortuneStartSchema, FortuneChatSchema } from '../validators/fortune.js';

const fortune = new Hono();

/**
 * Format BaZi data into a readable string for the LLM prompt
 */
function formatBaziForPrompt(baziData: any): string {
  const lines = [
    `年柱：${baziData.yearPillar.stem}${baziData.yearPillar.branch}（${baziData.yearPillar.element}）`,
    `月柱：${baziData.monthPillar.stem}${baziData.monthPillar.branch}（${baziData.monthPillar.element}）`,
    `日柱：${baziData.dayPillar.stem}${baziData.dayPillar.branch}（${baziData.dayPillar.element}）`,
  ];
  if (baziData.hourPillar) {
    lines.push(`时柱：${baziData.hourPillar.stem}${baziData.hourPillar.branch}（${baziData.hourPillar.element}）`);
  } else {
    lines.push('时柱：未知');
  }
  const fe = baziData.fiveElements;
  lines.push(`五行统计：金${fe.metal} 木${fe.wood} 水${fe.water} 火${fe.fire} 土${fe.earth}`);
  lines.push(`五行总结：${baziData.summary}`);
  return lines.join('\n');
}

/**
 * POST /api/fortune/start
 * First fortune analysis with structured five-dimension output (SSE stream)
 */
fortune.post('/start', async (c) => {
  const body = await c.req.json();
  const parsed = FortuneStartSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: '请求参数无效', details: parsed.error.issues } },
      400
    );
  }

  const { baziData, gender } = parsed.data;
  const baziInfo = formatBaziForPrompt(baziData);
  const userPrompt = buildFirstAnalysisPrompt(baziInfo, gender);

  return streamSSE(c, async (stream) => {
    try {
      let fullContent = '';

      for await (const chunk of streamChat(SYSTEM_PROMPT, [
        { role: 'user', content: userPrompt },
      ])) {
        fullContent += chunk;

        // Stream raw content chunks to frontend for typewriter effect
        await stream.writeSSE({
          data: JSON.stringify({ type: 'chunk', content: chunk }),
        });
      }

      // Send the complete content for structured parsing on the frontend
      await stream.writeSSE({
        data: JSON.stringify({ type: 'complete', content: fullContent }),
      });

      await stream.writeSSE({ data: '[DONE]' });
    } catch (err: any) {
      console.error('LLM stream error:', err);
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'error',
          message: err.message || '大师正在卜算中，请稍后再试',
        }),
      });
    }
  });
});

/**
 * POST /api/fortune/chat
 * Follow-up conversation (SSE stream)
 */
fortune.post('/chat', async (c) => {
  const body = await c.req.json();
  const parsed = FortuneChatSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: '请求参数无效', details: parsed.error.issues } },
      400
    );
  }

  const { message, baziData, history, round } = parsed.data;

  if (round > 20) {
    return c.json(
      { error: { code: 'ROUND_LIMIT', message: '今日卦象已尽，明日再来问卦' } },
      400
    );
  }

  const baziInfo = formatBaziForPrompt(baziData);
  const chatSystemPrompt = SYSTEM_PROMPT + '\n\n' + buildChatPrompt(baziInfo, round);

  const messages = [
    ...history.map((h) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: message },
  ];

  return streamSSE(c, async (stream) => {
    try {
      for await (const chunk of streamChat(chatSystemPrompt, messages)) {
        await stream.writeSSE({
          data: JSON.stringify({ type: 'chat', content: chunk }),
        });
      }

      await stream.writeSSE({ data: '[DONE]' });
    } catch (err: any) {
      console.error('LLM chat error:', err);
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'error',
          message: err.message || '大师正在卜算中，请稍后再试',
        }),
      });
    }
  });
});

export default fortune;
