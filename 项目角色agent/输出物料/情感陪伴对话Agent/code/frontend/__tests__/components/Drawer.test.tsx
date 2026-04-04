import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Drawer } from "@/components/ui/Drawer";

describe("Drawer", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <Drawer open={false} onClose={() => {}}>Content</Drawer>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders children when open", () => {
    render(
      <Drawer open={true} onClose={() => {}}>
        <p>Drawer content</p>
      </Drawer>
    );
    expect(screen.getByText("Drawer content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <Drawer open={true} onClose={() => {}} title="Details">
        Content
      </Drawer>
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("renders close button with title", () => {
    render(
      <Drawer open={true} onClose={() => {}} title="Test">
        Content
      </Drawer>
    );
    expect(screen.getByLabelText("关闭")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose} title="Test">
        Content
      </Drawer>
    );
    fireEvent.click(screen.getByLabelText("关闭"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay clicked", () => {
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose}>
        Content
      </Drawer>
    );
    // Click the outer container (overlay)
    const overlay = screen.getByText("Content").closest(".fixed")!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when drawer content clicked", () => {
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose}>
        <p>Click me</p>
      </Drawer>
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sets body overflow hidden when open", () => {
    render(
      <Drawer open={true} onClose={() => {}}>
        Content
      </Drawer>
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("renders handle bar when not fullScreen", () => {
    const { container } = render(
      <Drawer open={true} onClose={() => {}}>
        Content
      </Drawer>
    );
    // The handle bar is a w-10 h-1 rounded-full div
    const handleBar = container.querySelector(".w-10.h-1.rounded-full");
    expect(handleBar).toBeInTheDocument();
  });
});
