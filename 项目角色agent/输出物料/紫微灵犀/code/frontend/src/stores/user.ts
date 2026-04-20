/**
 * 用户 store：登录态 / token / user / profile
 */
import { defineStore } from "pinia";
import type { AuthTokenPair, UserBrief, UserProfile } from "@/types/api";
import { getItem, removeItem, setItem, STORAGE_KEYS } from "@/utils/storage";
import { authApi } from "@/services/auth";
import { userApi } from "@/services/user";

interface State {
  token: string | null;
  refreshToken: string | null;
  user: UserBrief | null;
  profile: UserProfile | null;
}

export const useUserStore = defineStore("user", {
  state: (): State => ({
    token: getItem<string>(STORAGE_KEYS.TOKEN),
    refreshToken: getItem<string>(STORAGE_KEYS.REFRESH_TOKEN),
    user: getItem<UserBrief>(STORAGE_KEYS.USER),
    profile: getItem<UserProfile>(STORAGE_KEYS.PROFILE),
  }),
  getters: {
    isLoggedIn: (s): boolean => !!s.token,
    hasProfile: (s): boolean => !!s.user?.has_profile || !!s.profile,
    pointsBalance: (s): number => s.user?.points_balance ?? 0,
  },
  actions: {
    setTokens(tokens: AuthTokenPair) {
      this.token = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      setItem(STORAGE_KEYS.TOKEN, tokens.access_token);
      setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    },
    setUser(user: UserBrief) {
      this.user = user;
      setItem(STORAGE_KEYS.USER, user);
    },
    updatePoints(balance: number) {
      if (this.user) {
        this.user.points_balance = balance;
        setItem(STORAGE_KEYS.USER, this.user);
      }
    },
    async login(phone: string, password: string) {
      const resp = await authApi.login({ phone, password });
      if (resp.data) {
        this.setTokens(resp.data.tokens);
        this.setUser(resp.data.user);
      }
      return resp.data;
    },
    async register(phone: string, password: string, inviteCode?: string) {
      const resp = await authApi.register({
        phone,
        password,
        invite_code: inviteCode,
      });
      if (resp.data) {
        this.setTokens(resp.data.tokens);
        this.setUser(resp.data.user);
      }
      return resp.data;
    },
    async fetchMe() {
      const resp = await userApi.me();
      if (resp.data) this.setUser(resp.data);
      return resp.data;
    },
    async fetchProfile() {
      const resp = await userApi.getProfile();
      if (resp.data) {
        this.profile = resp.data;
        setItem(STORAGE_KEYS.PROFILE, resp.data);
      }
      return resp.data;
    },
    logout() {
      this.token = null;
      this.refreshToken = null;
      this.user = null;
      this.profile = null;
      removeItem(STORAGE_KEYS.TOKEN);
      removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      removeItem(STORAGE_KEYS.USER);
      removeItem(STORAGE_KEYS.PROFILE);
      removeItem(STORAGE_KEYS.CHART);
    },
  },
});
