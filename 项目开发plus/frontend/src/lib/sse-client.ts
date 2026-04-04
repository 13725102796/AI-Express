/**
 * SSE Client — 连接 Gateway 的流式端点
 */

export interface SSEEvent {
  type: "start" | "step" | "done" | "streaming" | "thinking" | "cost" | "token_usage" | "agent_status" | "tool_use" | "message" | "state" | "error" | "end";
  node?: string;
  agent?: string;
  status?: string;
  content?: string;
  text?: string;
  message?: string;
  messages?: string[];
  tool?: string;
  input?: string;
  dispatches?: any[];
  artifacts?: string[];
  current_phase?: number;
  project_name?: string;
  thread_id?: string;
  cost_usd?: number;
}

export async function* streamRun(
  threadId: string,
  message: string,
  projectName?: string
): AsyncGenerator<SSEEvent> {
  const response = await fetch(
    `/api/threads/${threadId}/run/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ message, project_name: projectName }),
    }
  );

  if (!response.ok) {
    throw new Error(`SSE 连接失败: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("无法获取 response body reader");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event: SSEEvent = JSON.parse(line.slice(6));
          yield event;
        } catch {
          // 忽略非 JSON 行
        }
      }
    }
  }
}

/**
 * 同步调用（非流式）
 */
export async function runThread(
  threadId: string,
  message: string,
  projectName?: string
): Promise<{
  response: string;
  project_name: string;
  current_phase: number;
  dispatches: any[];
  artifacts: string[];
}> {
  const res = await fetch(`/api/threads/${threadId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, project_name: projectName }),
  });
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.json();
}

/**
 * 创建会话
 */
export async function createThread(title?: string): Promise<{ id: string; title: string; created_at: number }> {
  const res = await fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`创建会话失败: ${res.status}`);
  return res.json();
}

/**
 * 获取所有会话列表
 */
export async function listThreads(): Promise<any[]> {
  const res = await fetch("/api/threads");
  if (!res.ok) throw new Error(`获取会话列表失败: ${res.status}`);
  return res.json();
}

/**
 * 获取会话消息历史 + token 统计
 */
export async function getThreadMessages(threadId: string): Promise<{
  messages: { id: string; role: string; content: string; agent_type?: string; created_at: number }[];
  token_summary: { calls: number; input: number; output: number; cache_creation: number; cache_read: number };
}> {
  const res = await fetch(`/api/threads/${threadId}/messages`);
  if (!res.ok) throw new Error(`获取消息失败: ${res.status}`);
  return res.json();
}

/**
 * 删除会话
 */
export async function deleteThread(threadId: string): Promise<void> {
  await fetch(`/api/threads/${threadId}`, { method: "DELETE" });
}

/**
 * 获取文件树
 */
export async function getFileTree(project?: string): Promise<{ tree: any[] }> {
  const params = project ? `?project=${encodeURIComponent(project)}` : "";
  const res = await fetch(`/api/files/tree${params}`);
  if (!res.ok) throw new Error(`获取文件树失败: ${res.status}`);
  return res.json();
}

/**
 * 读取文件内容
 */
export async function readFile(path: string): Promise<{ content: string; mime_type: string }> {
  const res = await fetch(`/api/files/read/${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`读取文件失败: ${res.status}`);
  return res.json();
}

/**
 * 上传文件
 */
export interface UploadedFile {
  filename: string;
  path: string;
  size: number;
}

export async function uploadFiles(files: FileList | File[]): Promise<UploadedFile[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const res = await fetch("/api/files/upload-multiple", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`上传失败: ${res.status}`);
  const data = await res.json();
  return data.files;
}
