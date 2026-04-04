import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders with children text", () => {
    render(<Button>发送</Button>);
    expect(screen.getByText("发送")).toBeInTheDocument();
  });

  it("applies primary variant by default", () => {
    render(<Button>Test</Button>);
    const button = screen.getByText("Test");
    expect(button.className).toContain("bg-primary");
  });

  it("applies secondary variant", () => {
    render(<Button variant="secondary">Test</Button>);
    const button = screen.getByText("Test");
    expect(button.className).toContain("bg-surface-2");
  });

  it("shows loading spinner when loading", () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByText("Loading").closest("button");
    expect(button).toBeDisabled();
    expect(button?.querySelector(".animate-spin")).toBeTruthy();
  });

  it("disables button when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText("Disabled").closest("button")).toBeDisabled();
  });

  it("calls onClick handler", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies pill styling when pill prop is true", () => {
    render(<Button pill>Pill</Button>);
    expect(screen.getByText("Pill").className).toContain("rounded-full");
  });
});
