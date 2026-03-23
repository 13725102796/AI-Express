import type { Message, Citation, Conversation } from "@/stores/chatStore";
import { apiJson, apiStream } from "@/lib/api";

export async function fetchConversations(): Promise<Conversation[]> {
  try {
    const data = await apiJson<any>("/api/chat/history");
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.conversations && Array.isArray(data.conversations)) return data.conversations;
    return [];
  } catch {
    return [];
  }
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  try {
    const data = await apiJson<any>(`/api/chat/${conversationId}`);
    if (Array.isArray(data)) return data;
    if (data?.messages && Array.isArray(data.messages)) return data.messages;
    return [];
  } catch {
    return [];
  }
}

export async function* streamChat(
  question: string,
  spaceId: string
): AsyncGenerator<{ type: "text" | "citations"; data: string | Citation[] }> {
  const res = await apiStream("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message: question, ...(spaceId && spaceId !== "all" ? { space_id: spaceId } : {}) }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events line by line
    const lines = buffer.split("\n");
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const rawData = line.slice(6);
        try {
          const parsed = JSON.parse(rawData);
          if (currentEvent === "text_delta") {
            yield { type: "text", data: parsed.delta || "" };
          } else if (currentEvent === "citation") {
            yield { type: "citations", data: [parsed] as Citation[] };
          } else if (currentEvent === "message_end") {
            return;
          } else if (!currentEvent && parsed.delta) {
            yield { type: "text", data: parsed.delta };
          }
        } catch {
          // Skip malformed data lines
        }
        currentEvent = "";
      }
    }
  }
}

export async function submitFeedback(
  messageId: string,
  feedback: "helpful" | "unhelpful"
): Promise<void> {
  await apiJson(`/api/chat/feedback`, {
    method: "POST",
    body: JSON.stringify({ message_id: messageId, feedback }),
  });
}
