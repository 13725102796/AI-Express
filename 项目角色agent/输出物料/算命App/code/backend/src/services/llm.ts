import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.LLM_API_KEY || '',
      baseURL: process.env.LLM_BASE_URL || 'https://api.ttk.homes/v1',
    });
  }
  return client;
}

/**
 * Stream chat completion from LLM provider.
 * Yields content chunks as they arrive.
 */
export async function* streamChat(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
): AsyncGenerator<string> {
  const openai = getClient();

  const stream = await openai.chat.completions.create({
    model: process.env.LLM_MODEL || 'gemini-3.1-pro-preview-cli',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
    temperature: 0.8,
    max_tokens: 3000,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

/**
 * Non-streaming chat completion (for simpler use cases).
 */
export async function chatCompletion(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Promise<string> {
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: process.env.LLM_MODEL || 'gemini-3.1-pro-preview-cli',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.8,
    max_tokens: 3000,
  });

  return response.choices[0]?.message?.content || '';
}
