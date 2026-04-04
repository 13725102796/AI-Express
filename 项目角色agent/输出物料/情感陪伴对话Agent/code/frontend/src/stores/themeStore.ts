import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DarkModePreference } from "@/types/user";

interface ThemeState {
  mode: DarkModePreference;
  setMode: (mode: DarkModePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
    }),
    { name: "liminal-theme" }
  )
);
