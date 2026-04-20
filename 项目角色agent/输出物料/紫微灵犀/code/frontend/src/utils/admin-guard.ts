/**
 * 管理后台访问守卫
 * - 进入任意 pages-admin/** 页面前校验 admin_token
 * - 无 token 时 uni.reLaunch → /pages-admin/login/login
 */
import { getItem, removeItem, STORAGE_KEYS } from "@/utils/storage";

export function ensureAdminAuth(): boolean {
  const token = getItem<string>(STORAGE_KEYS.ADMIN_TOKEN);
  if (!token) {
    uni.reLaunch({ url: "/pages-admin/login/login" });
    return false;
  }
  return true;
}

/**
 * 管理员退出登录
 */
export function adminLogout() {
  removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  removeItem(STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
  removeItem(STORAGE_KEYS.ADMIN_BRIEF);
  uni.reLaunch({ url: "/pages-admin/login/login" });
}
