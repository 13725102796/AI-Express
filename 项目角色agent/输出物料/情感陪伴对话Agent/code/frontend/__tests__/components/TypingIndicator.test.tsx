import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

describe("TypingIndicator", () => {
  it("renders the typing text", () => {
    render(<TypingIndicator />);
    expect(screen.getByText("留白在想")).toBeInTheDocument();
  });

  it("renders three animated dots", () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll(".animate-breathing");
    expect(dots.length).toBe(3);
  });

  it("dots have staggered animation delays", () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll(".animate-breathing");
    expect(dots[0].getAttribute("style")).toContain("animation-delay: 0ms");
    expect(dots[1].getAttribute("style")).toContain("animation-delay: 200ms");
    expect(dots[2].getAttribute("style")).toContain("animation-delay: 400ms");
  });
});
