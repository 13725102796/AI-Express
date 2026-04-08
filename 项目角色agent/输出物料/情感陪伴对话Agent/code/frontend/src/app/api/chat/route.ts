import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { buildSystemPrompt } from "@/lib/ai/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  const t0 = Date.now();
  const { messages } = await req.json();

  const systemPrompt = buildSystemPrompt({
    nickname: "朋友",
    aiName: "留白",
    companionStyle: "warm",
    memories: [],
  });

  // 只保留最近 6 条消息（3轮对话），将 prefill token 数控制在稳定区间
  const recentMessages = messages.slice(-6);

  const tReady = Date.now();
  let tFirstToken = 0;
  let tokenCount = 0;

  const result = streamText({
    model: openai.chat("gemma-4-26B-A4B-it-UD-Q3_K_M.gguf"),
    system: systemPrompt,
    messages: await convertToModelMessages(recentMessages),
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        tokenCount++;
        if (tFirstToken === 0) {
          tFirstToken = Date.now();
          console.log(`[timing] ① 解析请求:    ${tReady - t0}ms`);
          console.log(`[timing] ② prefill+LAN:  ${tFirstToken - tReady}ms  (请求到达→首 token)`);
        }
      }
    },
    onFinish: () => {
      const tEnd = Date.now();
      console.log(`[timing] ③ 生成耗时:    ${tEnd - tFirstToken}ms  (${tokenCount} tokens)`);
      console.log(`[timing] ④ 全链路合计:  ${tEnd - t0}ms`);
      console.log(`[timing] ⑤ 吞吐:        ${Math.round(tokenCount / ((tEnd - tFirstToken) / 1000))} tokens/s`);
    },
  });

  const response = result.toUIMessageStreamResponse();
  // 把服务端收到请求的时间戳传给客户端，用于拆解链路延迟
  const headers = new Headers(response.headers);
  headers.set("X-Server-Start", String(t0));
  return new Response(response.body, { headers });
}
