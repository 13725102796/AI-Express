import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Pill } from "@/components/ui/Pill";

describe("Pill", () => {
  it("renders children text", () => {
    render(<Pill>Tag</Pill>);
    expect(screen.getByText("Tag")).toBeInTheDocument();
  });

  it("renders as span when no onClick", () => {
    render(<Pill>Static</Pill>);
    const el = screen.getByText("Static");
    expect(el.tagName).toBe("SPAN");
  });

  it("renders as button when onClick provided", () => {
    render(<Pill onClick={() => {}}>Click</Pill>);
    const el = screen.getByText("Click");
    expect(el.tagName).toBe("BUTTON");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Pill onClick={onClick}>Click me</Pill>);
    fireEvent.click(screen.getByText("Click me"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies active styling", () => {
    render(<Pill active>Active</Pill>);
    const el = screen.getByText("Active");
    expect(el.className).toContain("bg-primary");
  });

  it("applies default styling when not active", () => {
    render(<Pill>Default</Pill>);
    const el = screen.getByText("Default");
    expect(el.className).toContain("bg-surface-2");
  });

  it("applies sm size classes", () => {
    render(<Pill size="sm">Small</Pill>);
    const el = screen.getByText("Small");
    expect(el.className).toContain("text-xs");
  });

  it("applies md size classes", () => {
    render(<Pill size="md">Medium</Pill>);
    const el = screen.getByText("Medium");
    expect(el.className).toContain("text-sm");
  });

  it("applies custom color via style", () => {
    render(<Pill color="red">Colored</Pill>);
    const el = screen.getByText("Colored");
    expect(el.style.color).toBe("red");
  });

  it("does not apply custom color when active", () => {
    render(<Pill color="red" active>Active</Pill>);
    const el = screen.getByText("Active");
    expect(el.style.color).toBeFalsy();
  });
});
