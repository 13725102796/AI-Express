import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Toast } from "@/components/ui/Toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when visible is false", () => {
    const { container } = render(
      <Toast message="Test" visible={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders message when visible", () => {
    render(<Toast message="Operation successful" visible={true} onClose={() => {}} />);
    expect(screen.getByText("Operation successful")).toBeInTheDocument();
  });

  it("applies success styling by default", () => {
    render(<Toast message="Done" visible={true} onClose={() => {}} />);
    const toast = screen.getByText("Done");
    expect(toast.className).toContain("success");
  });

  it("applies error styling", () => {
    render(<Toast message="Error" type="error" visible={true} onClose={() => {}} />);
    const toast = screen.getByText("Error");
    expect(toast.className).toContain("error");
  });

  it("applies warning styling", () => {
    render(<Toast message="Warning" type="warning" visible={true} onClose={() => {}} />);
    const toast = screen.getByText("Warning");
    expect(toast.className).toContain("warning");
  });

  it("auto-closes after duration", () => {
    const onClose = vi.fn();
    render(
      <Toast message="Auto close" visible={true} onClose={onClose} duration={3000} />
    );
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not auto-close when duration is 0", () => {
    const onClose = vi.fn();
    render(
      <Toast message="Stay" visible={true} onClose={onClose} duration={0} />
    );
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
