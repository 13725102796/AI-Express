import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "@/stores/themeStore";

describe("themeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: "system" });
  });

  it("has system as default mode", () => {
    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("sets mode to dark", () => {
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().mode).toBe("dark");
  });

  it("sets mode to light", () => {
    useThemeStore.getState().setMode("light");
    expect(useThemeStore.getState().mode).toBe("light");
  });

  it("sets mode back to system", () => {
    useThemeStore.getState().setMode("dark");
    useThemeStore.getState().setMode("system");
    expect(useThemeStore.getState().mode).toBe("system");
  });
});
