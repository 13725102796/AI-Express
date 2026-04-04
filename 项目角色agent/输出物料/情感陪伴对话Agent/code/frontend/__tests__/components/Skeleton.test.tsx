import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton, MessageSkeleton, FossilSkeleton } from "@/components/ui/Skeleton";

describe("Skeleton", () => {
  it("renders with shimmer animation", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("animate-shimmer");
  });

  it("applies text variant by default", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-4");
  });

  it("applies circular variant", () => {
    const { container } = render(<Skeleton variant="circular" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("rounded-full");
  });

  it("applies custom width and height", () => {
    const { container } = render(<Skeleton width="200px" height="50px" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("200px");
    expect(el.style.height).toBe("50px");
  });
});

describe("MessageSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<MessageSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("aligns AI messages left", () => {
    const { container } = render(<MessageSkeleton isAi={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("justify-start");
  });

  it("aligns user messages right", () => {
    const { container } = render(<MessageSkeleton isAi={false} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("justify-end");
  });
});

describe("FossilSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<FossilSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders multiple skeleton elements", () => {
    const { container } = render(<FossilSkeleton />);
    const shimmerElements = container.querySelectorAll(".animate-shimmer");
    expect(shimmerElements.length).toBeGreaterThan(2);
  });
});
