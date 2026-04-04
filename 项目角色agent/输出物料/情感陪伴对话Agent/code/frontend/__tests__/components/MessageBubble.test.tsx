import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMessage } from "@/types/chat";

const makeMsg = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "msg-1",
  role: "user",
  content: "Hello there",
  createdAt: new Date(),
  ...overrides,
});

describe("MessageBubble", () => {
  it("renders user message content", () => {
    render(<MessageBubble message={makeMsg({ content: "User text" })} />);
    expect(screen.getByText("User text")).toBeInTheDocument();
  });

  it("renders assistant message content", () => {
    render(
      <MessageBubble
        message={makeMsg({ role: "assistant", content: "AI reply" })}
      />
    );
    expect(screen.getByText("AI reply")).toBeInTheDocument();
  });

  it("renders system message centered", () => {
    render(
      <MessageBubble
        message={makeMsg({ role: "system", content: "System notice" })}
      />
    );
    const el = screen.getByText("System notice");
    expect(el.closest("div")?.className).toContain("justify-center");
  });

  it("aligns user messages to the right", () => {
    const { container } = render(<MessageBubble message={makeMsg()} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("justify-end");
  });

  it("aligns assistant messages to the left", () => {
    const { container } = render(
      <MessageBubble message={makeMsg({ role: "assistant" })} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("justify-start");
  });

  it("shows streaming cursor when isStreaming", () => {
    const { container } = render(
      <MessageBubble
        message={makeMsg({ role: "assistant", content: "Typing..." })}
        isStreaming={true}
      />
    );
    const cursor = container.querySelector(".animate-breathing");
    expect(cursor).toBeInTheDocument();
  });

  it("does not show streaming cursor when not streaming", () => {
    const { container } = render(
      <MessageBubble message={makeMsg({ role: "assistant" })} isStreaming={false} />
    );
    // The breathing animation inside the bubble should not exist
    const bubble = container.querySelector("p");
    const cursor = bubble?.querySelector(".animate-breathing");
    expect(cursor).toBeNull();
  });

  it("shows emotion pill for assistant messages with emotion", () => {
    render(
      <MessageBubble
        message={makeMsg({
          role: "assistant",
          emotion: "sad",
          emotionColor: "emotion-sad",
        })}
      />
    );
    expect(screen.getByText("sad")).toBeInTheDocument();
  });

  it("does not show emotion pill for user messages", () => {
    render(
      <MessageBubble
        message={makeMsg({ role: "user", emotion: "happy" })}
      />
    );
    expect(screen.queryByText("happy")).toBeNull();
  });

  it("does not show emotion pill when streaming", () => {
    render(
      <MessageBubble
        message={makeMsg({ role: "assistant", emotion: "calm" })}
        isStreaming={true}
      />
    );
    expect(screen.queryByText("calm")).toBeNull();
  });
});
