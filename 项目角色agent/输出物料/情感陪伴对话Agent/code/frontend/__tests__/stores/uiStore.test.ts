import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    useUIStore.setState({ toast: null });
  });

  it("has null toast initially", () => {
    expect(useUIStore.getState().toast).toBeNull();
  });

  it("shows success toast by default", () => {
    useUIStore.getState().showToast("Saved!");
    const toast = useUIStore.getState().toast;
    expect(toast?.message).toBe("Saved!");
    expect(toast?.type).toBe("success");
  });

  it("shows error toast", () => {
    useUIStore.getState().showToast("Failed", "error");
    const toast = useUIStore.getState().toast;
    expect(toast?.message).toBe("Failed");
    expect(toast?.type).toBe("error");
  });

  it("shows warning toast", () => {
    useUIStore.getState().showToast("Careful", "warning");
    const toast = useUIStore.getState().toast;
    expect(toast?.type).toBe("warning");
  });

  it("hides toast", () => {
    useUIStore.getState().showToast("Test");
    useUIStore.getState().hideToast();
    expect(useUIStore.getState().toast).toBeNull();
  });

  it("replaces existing toast with new one", () => {
    useUIStore.getState().showToast("First");
    useUIStore.getState().showToast("Second", "error");
    const toast = useUIStore.getState().toast;
    expect(toast?.message).toBe("Second");
    expect(toast?.type).toBe("error");
  });
});
