"use client";

import { useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { SpaceSelector } from "@/components/chat/SpaceSelector";
import { useChatStore } from "@/stores/chatStore";
import { fetchConversations } from "@/services/chat";

const welcomeSuggestions = [
  "帮我总结最近上传的竞品分析报告的核心结论",
  "2025 年 Q4 的关键业务指标有哪些变化？",
  "我的知识库中有哪些关于用户增长策略的资料？",
  "对比我收藏的几篇关于 RAG 技术的论文，各有什么优缺点？",
];

export default function ChatPage() {
  const { messages, isGenerating, scrollRef, sendMessage, stopGenerating, handleFeedback, startNewChat } =
    useChat();
  const { conversations, setConversations } = useChatStore();

  useEffect(() => {
    fetchConversations().then(data => setConversations(Array.isArray(data) ? data : []));
  }, [setConversations]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Conversation sidebar (desktop) */}
      <div className="hidden lg:flex flex-col w-64 border-r border-border bg-bg-card">
        <div className="p-3 border-b border-border">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/5 rounded-[var(--radius-btn)] hover:bg-primary/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                // Load conversation messages
                useChatStore.getState().setActiveConversation(conv.id);
              }}
              className="w-full text-left px-3 py-2 rounded-[var(--radius-btn)] text-sm text-text-sec hover:bg-bg-sec transition-colors truncate"
            >
              {conv.title}
              <span className="block text-[11px] text-text-tert mt-0.5">{conv.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar: Space selector */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-card">
          <SpaceSelector />
          <button
            onClick={startNewChat}
            className="lg:hidden text-sm text-primary font-medium hover:underline"
          >
            + 新对话
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {isEmpty ? (
              /* Welcome state */
              <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-text-main mb-1">有什么可以帮你的？</h2>
                <p className="text-sm text-text-sec mb-6">基于你的知识库内容进行 AI 问答</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {welcomeSuggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(suggestion)}
                      className="text-left p-3 text-sm text-text-sec bg-bg-sec border border-border rounded-[var(--radius-card)] hover:bg-bg-card hover:border-text-tert hover:shadow-[var(--shadow-card)] transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  onFeedback={handleFeedback}
                />
              ))
            )}

            {/* Typing indicator */}
            {isGenerating && messages[messages.length - 1]?.content === "" && (
              <div className="flex items-center gap-2 text-text-tert text-sm ml-11">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>AI 正在思考...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          onStop={stopGenerating}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
}
