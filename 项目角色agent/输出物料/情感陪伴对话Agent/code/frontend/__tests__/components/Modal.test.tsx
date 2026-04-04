import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title when open", () => {
    render(<Modal open={true} onClose={() => {}} title="Confirm action" />);
    expect(screen.getByText("Confirm action")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test" description="Are you sure?" />
    );
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test">
        <p>Custom child content</p>
      </Modal>
    );
    expect(screen.getByText("Custom child content")).toBeInTheDocument();
  });

  it("calls onClose when cancel button clicked", () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Test" />);
    fireEvent.click(screen.getByText("取消"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(
      <Modal open={true} onClose={() => {}} title="Test" onConfirm={onConfirm} />
    );
    fireEvent.click(screen.getByText("确定"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses custom button text", () => {
    render(
      <Modal
        open={true}
        onClose={() => {}}
        title="Test"
        confirmText="Delete"
        cancelText="Go back"
      />
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Go back")).toBeInTheDocument();
  });

  it("applies danger variant to confirm button", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test" danger onConfirm={() => {}} />
    );
    const confirmBtn = screen.getByText("确定");
    expect(confirmBtn.className).toContain("error");
  });

  it("calls onClose when overlay clicked", () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Test" />);
    // Click the outer overlay container
    const overlay = screen.getByText("Test").closest(".fixed")!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when modal content is clicked", () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Test" />);
    fireEvent.click(screen.getByText("Test"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sets body overflow hidden when open", () => {
    render(<Modal open={true} onClose={() => {}} title="Test" />);
    expect(document.body.style.overflow).toBe("hidden");
  });
});
