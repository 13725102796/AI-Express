import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ChatInput } from "@/components/chat/ChatInput";

describe("ChatInput", () => {
  it("renders textarea with placeholder", () => {
    render(<ChatInput onSend={() => {}} />);
    expect(screen.getByPlaceholderText("想说点什么...")).toBeInTheDocument();
  });

  it("renders send button", () => {
    render(<ChatInput onSend={() => {}} />);
    expect(screen.getByLabelText("发送")).toBeInTheDocument();
  });

  it("renders voice input button", () => {
    render(<ChatInput onSend={() => {}} />);
    expect(screen.getByLabelText("语音输入")).toBeInTheDocument();
  });

  it("send button disabled when text is empty", () => {
    render(<ChatInput onSend={() => {}} />);
    expect(screen.getByLabelText("发送")).toBeDisabled();
  });

  it("send button enabled when text entered", () => {
    render(<ChatInput onSend={() => {}} />);
    const textarea = screen.getByPlaceholderText("想说点什么...");
    fireEvent.change(textarea, { target: { value: "hello" } });
    expect(screen.getByLabelText("发送")).not.toBeDisabled();
  });

  it("calls onSend with trimmed text on click", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText("想说点什么...");
    fireEvent.change(textarea, { target: { value: "  hello world  " } });
    fireEvent.click(screen.getByLabelText("发送"));
    expect(onSend).toHaveBeenCalledWith("hello world");
  });

  it("clears input after send", () => {
    render(<ChatInput onSend={() => {}} />);
    const textarea = screen.getByPlaceholderText("想说点什么...") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.click(screen.getByLabelText("发送"));
    expect(textarea.value).toBe("");
  });

  it("sends on Enter key", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText("想说点什么...");
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("does not send on Shift+Enter", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText("想说点什么...");
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables textarea when disabled prop is true", () => {
    render(<ChatInput onSend={() => {}} disabled />);
    expect(screen.getByPlaceholderText("想说点什么...")).toBeDisabled();
  });

  it("does not send when disabled", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled />);
    const textarea = screen.getByPlaceholderText("想说点什么...");
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows over-limit warning when text exceeds 1000 chars", () => {
    render(<ChatInput onSend={() => {}} />);
    const textarea = screen.getByPlaceholderText("想说点什么...");
    fireEvent.change(textarea, { target: { value: "a".repeat(1001) } });
    expect(screen.getByText(/消息太长了/)).toBeInTheDocument();
  });

  it("does not show over-limit warning for text under 1000 chars", () => {
    render(<ChatInput onSend={() => {}} />);
    const textarea = screen.getByPlaceholderText("想说点什么...");
    fireEvent.change(textarea, { target: { value: "short text" } });
    expect(screen.queryByText(/消息太长了/)).toBeNull();
  });
});
