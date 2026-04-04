import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { buildSystemPrompt } from "@/lib/ai/prompts";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // TODO: Get user profile and memories from database
  // For now, use defaults
  const systemPrompt = buildSystemPrompt({
    nickname: "朋友",
    aiName: "留白",
    companionStyle: "warm",
    memories: [],
  });

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
