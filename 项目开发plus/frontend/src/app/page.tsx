"use client";

import { useEffect, useState, useCallback } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useGraphStore } from "@/stores/graph-store";
import { useProjectStore, type Project } from "@/stores/project-store";
import { createThread, streamRun, listThreads, getThreadMessages, deleteThread } from "@/lib/sse-client";
import { ChatPanel } from "@/components/chat/chat-panel";
import { FlowPanel } from "@/components/flow/flow-panel";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";

export default function Home() {
  const chatStore = useChatStore();
  const { setDispatches, reset: resetGraph } = useGraphStore();
  const projectStore = useProjectStore();
  const [activeTab, setActiveTab] = useState<"chat" | "flow">("chat");
  const [loaded, setLoaded] = useState(false);

  // 从后端加载项目列表（页面加载 / 刷新时）
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);

    listThreads().then(async (threads) => {
      if (threads.length === 0) {
        // 没有项目，创建一个
        const t = await createThread();
        const project: Project = {
          threadId: t.id, name: "新项目", createdAt: t.created_at,
          currentPhase: -1, totalCalls: 0, inputTokens: 0, outputTokens: 0,
          cacheCreationTokens: 0, cacheReadTokens: 0,
        };
        projectStore.addProject(project);
        chatStore.setThreadId(t.id);
      } else {
        // 恢复所有项目
        const projects: Project[] = threads.map((t: any) => ({
          threadId: t.id,
          name: t.project_name || t.title || "新项目",
          createdAt: t.created_at,
          currentPhase: t.current_phase ?? -1,
          totalCalls: t.token_summary?.calls ?? 0,
          inputTokens: t.token_summary?.input ?? 0,
          outputTokens: t.token_summary?.output ?? 0,
          cacheCreationTokens: t.token_summary?.cache_creation ?? 0,
          cacheReadTokens: t.token_summary?.cache_read ?? 0,
        }));

        // 批量设置项目列表
        for (const p of projects) {
          projectStore.addProject(p);
        }

        // 加载最新项目的消息
        const latest = projects[0];
        projectStore.setActiveProject(latest.threadId);
        await loadProjectMessages(latest.threadId, latest);
      }
    }).catch((err) => {
      console.error("加载项目失败:", err);
      // fallback: 创建新项目
      createThread().then((t) => {
        projectStore.addProject({
          threadId: t.id, name: "新项目", createdAt: Date.now(),
          currentPhase: -1, totalCalls: 0, inputTokens: 0, outputTokens: 0,
          cacheCreationTokens: 0, cacheReadTokens: 0,
        });
        chatStore.setThreadId(t.id);
      });
    });
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载项目消息到 chatStore
  const loadProjectMessages = useCallback(async (threadId: string, project: Project) => {
    chatStore.reset();
    resetGraph();
    chatStore.setThreadId(threadId);
    chatStore.setProjectName(project.name);
    chatStore.setCurrentPhase(project.currentPhase);

    // 恢复 token 统计
    if (project.totalCalls > 0) {
      useChatStore.setState({
        totalCalls: project.totalCalls,
        inputTokens: project.inputTokens,
        outputTokens: project.outputTokens,
        cacheCreationTokens: project.cacheCreationTokens,
        cacheReadTokens: project.cacheReadTokens,
      });
    }

    // 从后端加载消息历史
    try {
      const data = await getThreadMessages(threadId);
      for (const msg of data.messages) {
        chatStore.addMessage({ role: msg.role as any, content: msg.content });
      }
      // 用 DB 的 token 统计覆盖
      if (data.token_summary.calls > 0) {
        useChatStore.setState({
          totalCalls: data.token_summary.calls,
          inputTokens: data.token_summary.input,
          outputTokens: data.token_summary.output,
          cacheCreationTokens: data.token_summary.cache_creation,
          cacheReadTokens: data.token_summary.cache_read,
        });
      }
    } catch (err) {
      console.error("加载消息失败:", err);
    }
  }, [chatStore, resetGraph]);

  // 切换项目
  const switchProject = useCallback(async (threadId: string) => {
    projectStore.setActiveProject(threadId);
    const project = projectStore.projects.find((p) => p.threadId === threadId);
    if (project) {
      await loadProjectMessages(threadId, project);
    }
  }, [projectStore, loadProjectMessages]);

  // 新建项目
  const handleNewProject = useCallback(async () => {
    const t = await createThread();
    const project: Project = {
      threadId: t.id, name: "新项目", createdAt: Date.now(),
      currentPhase: -1, totalCalls: 0, inputTokens: 0, outputTokens: 0,
      cacheCreationTokens: 0, cacheReadTokens: 0,
    };
    projectStore.addProject(project);
    chatStore.reset();
    resetGraph();
    chatStore.setThreadId(t.id);
  }, [projectStore, chatStore, resetGraph]);

  // 删除项目
  const handleDeleteProject = useCallback(async (threadId: string) => {
    await deleteThread(threadId);
    projectStore.removeProject(threadId);
    // 如果删的是当前项目，切到第一个或新建
    if (projectStore.activeProjectId === threadId) {
      const remaining = projectStore.projects.filter((p) => p.threadId !== threadId);
      if (remaining.length > 0) {
        await switchProject(remaining[0].threadId);
      } else {
        await handleNewProject();
      }
    }
  }, [projectStore, switchProject, handleNewProject]);

  // 发送消息
  const handleSend = useCallback(async (message: string, _filePaths?: string[]) => {
    const threadId = chatStore.threadId;
    if (!threadId || chatStore.isLoading) return;

    chatStore.addMessage({ role: "user", content: message });
    chatStore.setLoading(true);

    const lines: string[] = [];
    const pushLine = (line: string) => {
      lines.push(line);
      if (lines.length > 15) lines.shift();
      chatStore.setProgressText(lines.join("\n"));
    };

    try {
      for await (const event of streamRun(threadId, message)) {
        if (event.type === "agent_status") pushLine(`🤖 ${event.message || `${event.agent} ${event.status}`}`);
        if (event.type === "tool_use") pushLine(`🔧 ${event.tool}: ${event.input || ""}`);
        if (event.type === "thinking" && event.text) pushLine(`💭 ${event.text.slice(0, 80)}`);

        // 流式文本 — 实时显示 Claude 正在输出的内容
        if (event.type === "streaming" && event.text) {
          chatStore.setProgressText(event.text);
        }

        if (event.type === "token_usage") {
          const e = event as any;
          chatStore.addTokenUsage(e.input_tokens || 0, e.output_tokens || 0, e.cache_creation_tokens || 0, e.cache_read_tokens || 0);
          const s = useChatStore.getState();
          projectStore.updateProject(threadId, {
            totalCalls: s.totalCalls, inputTokens: s.inputTokens, outputTokens: s.outputTokens,
            cacheCreationTokens: s.cacheCreationTokens, cacheReadTokens: s.cacheReadTokens,
          });
        }

        if (event.type === "step") {
          if (event.messages?.length) {
            for (const msg of event.messages) chatStore.addMessage({ role: "assistant", content: msg });
          }
          if (event.dispatches?.length) setDispatches(event.dispatches);
          if (event.project_name) {
            chatStore.setProjectName(event.project_name);
            projectStore.updateProject(threadId, { name: event.project_name });
          }
          if (event.current_phase != null && event.current_phase >= 0) {
            chatStore.setCurrentPhase(event.current_phase);
            projectStore.updateProject(threadId, { currentPhase: event.current_phase });
          }
        }

        if (event.type === "done") {
          if (event.dispatches?.length) setDispatches(event.dispatches);
          if (event.project_name) {
            chatStore.setProjectName(event.project_name);
            projectStore.updateProject(threadId, { name: event.project_name });
          }
          if (event.current_phase != null && event.current_phase >= 0) {
            chatStore.setCurrentPhase(event.current_phase);
            projectStore.updateProject(threadId, { currentPhase: event.current_phase });
          }
        }

        if (event.type === "error") chatStore.addMessage({ role: "system", content: `错误: ${event.message}` });
      }
    } catch (err) {
      chatStore.addMessage({ role: "system", content: `连接错误: ${err}` });
    } finally {
      chatStore.setLoading(false);
    }
  }, [chatStore, setDispatches, projectStore]);

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      <header className="h-12 flex items-center px-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h1 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>AI Express Workbench</h1>
        <div className="ml-auto flex gap-1">
          <TabButton active={activeTab === "chat"} onClick={() => setActiveTab("chat")}>对话</TabButton>
          <TabButton active={activeTab === "flow"} onClick={() => setActiveTab("flow")}>流程图</TabButton>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className="w-64 border-r flex flex-col" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <button onClick={handleNewProject}
              className="w-full px-3 py-2 text-xs rounded-lg border transition-colors hover:border-blue-500"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)", background: "var(--color-surface-2)" }}>
              + 新建项目
            </button>
          </div>

          <div className="p-2 space-y-0.5 border-b overflow-y-auto" style={{ borderColor: "var(--color-border)", maxHeight: "200px" }}>
            {projectStore.projects.map((p) => (
              <div key={p.threadId} className="flex items-center group">
                <button onClick={() => switchProject(p.threadId)}
                  className="flex-1 text-left px-3 py-1.5 rounded-lg text-xs transition-colors truncate"
                  style={{
                    background: p.threadId === projectStore.activeProjectId ? "var(--color-surface-2)" : "transparent",
                    color: p.threadId === projectStore.activeProjectId ? "var(--color-text)" : "var(--color-text-secondary)",
                  }}>
                  {p.name}
                </button>
                <button onClick={() => handleDeleteProject(p.threadId)}
                  className="opacity-0 group-hover:opacity-100 px-1 text-xs transition-opacity"
                  style={{ color: "var(--color-text-secondary)" }}
                  title="删除项目">×</button>
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-0 p-3 overflow-y-auto">
            <DashboardPanel />
          </div>
        </aside>

        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === "chat" ? <ChatPanel onSend={handleSend} /> : <FlowPanel />}
        </main>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="px-3 py-1 text-xs rounded-md transition-colors"
      style={{ background: active ? "var(--color-primary)" : "transparent", color: active ? "#fff" : "var(--color-text-secondary)" }}>
      {children}
    </button>
  );
}
