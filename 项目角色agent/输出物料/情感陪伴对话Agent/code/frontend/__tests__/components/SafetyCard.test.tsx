import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SafetyCard } from "@/components/chat/SafetyCard";
import { SAFETY_RESOURCES } from "@/types/chat";

describe("SafetyCard", () => {
  it("renders the help message", () => {
    render(<SafetyCard />);
    expect(
      screen.getByText("如果你正在经历困难，这些资源可以帮到你：")
    ).toBeInTheDocument();
  });

  it("renders all safety resources", () => {
    render(<SafetyCard />);
    for (const resource of SAFETY_RESOURCES) {
      expect(screen.getByText(resource.name)).toBeInTheDocument();
      expect(screen.getByText(resource.phone)).toBeInTheDocument();
    }
  });

  it("renders resources as tel: links", () => {
    render(<SafetyCard />);
    for (const resource of SAFETY_RESOURCES) {
      const link = screen.getByText(resource.name).closest("a");
      expect(link).toHaveAttribute("href", `tel:${resource.phone}`);
    }
  });

  it("renders the disclaimer text", () => {
    render(<SafetyCard />);
    expect(
      screen.getByText(/留白不是专业心理咨询服务/)
    ).toBeInTheDocument();
  });
});
