/**
 * 紫微灵犀 格式化工具
 */

/** 千分位格式化 */
export function formatNumber(n: number | string): string {
  if (n === null || n === undefined || n === "") return "--";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "--";
  return num.toLocaleString("zh-CN");
}

/** 积分显示：3,000 ¤ */
export function formatPoints(n: number | string): string {
  return `${formatNumber(n)} ¤`;
}

/** 时辰索引 → 名称（0-12） */
export const TIME_NAMES = [
  "早子时（00:00-01:00）",
  "丑时（01:00-03:00）",
  "寅时（03:00-05:00）",
  "卯时（05:00-07:00）",
  "辰时（07:00-09:00）",
  "巳时（09:00-11:00）",
  "午时（11:00-13:00）",
  "未时（13:00-15:00）",
  "申时（15:00-17:00）",
  "酉时（17:00-19:00）",
  "戌时（19:00-21:00）",
  "亥时（21:00-23:00）",
  "晚子时（23:00-24:00）",
];

export function timeIndexToName(idx: number): string {
  return TIME_NAMES[idx] || `未知（${idx}）`;
}

/** ISO 时间 → 简短显示 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 相对时间 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "--";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "--";
  const diff = Date.now() - t;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return formatDate(iso);
}

/** 手机号脱敏 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || "";
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

/** 手机号合法性（简单校验） */
export function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

/** 一月有多少天（支持平闰年） */
export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}
