import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/types/user";

const mockUser: User = {
  id: "user-1",
  nickname: "TestUser",
  aiName: "LiuBai",
  phone: "138****1234",
  companionStyle: "warm",
  tier: "free",
  onboardingCompleted: true,
  darkMode: "system",
  notificationsEnabled: true,
  echoLetterReminder: true,
  breathingVibration: true,
  registeredDays: 10,
  createdAt: new Date(),
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });
  });

  it("has correct initial state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("sets user and marks as authenticated", () => {
    useAuthStore.getState().setUser(mockUser);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it("updates user partially", () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().updateUser({ nickname: "NewName" });
    expect(useAuthStore.getState().user?.nickname).toBe("NewName");
    // Other fields remain
    expect(useAuthStore.getState().user?.aiName).toBe("LiuBai");
  });

  it("updateUser is no-op when user is null", () => {
    useAuthStore.getState().updateUser({ nickname: "ghost" });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logs out correctly", () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("updates companion style", () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().updateUser({ companionStyle: "rational" });
    expect(useAuthStore.getState().user?.companionStyle).toBe("rational");
  });

  it("updates notification preferences", () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().updateUser({
      notificationsEnabled: false,
      echoLetterReminder: false,
    });
    const user = useAuthStore.getState().user;
    expect(user?.notificationsEnabled).toBe(false);
    expect(user?.echoLetterReminder).toBe(false);
  });
});
