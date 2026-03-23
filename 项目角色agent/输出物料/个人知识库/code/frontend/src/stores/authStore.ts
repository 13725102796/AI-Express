import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: "free" | "pro";
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

// Mock user for development
const mockUser: User = {
  id: "u-001",
  name: "李伟",
  email: "liwei@example.com",
  plan: "free",
};

export const useAuthStore = create<AuthState>((set) => ({
  user: mockUser,
  loading: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null }),
}));
