import { adminHttp, http } from "@/utils/request";
import type {
  AdminCreateTemplateReq,
  AdminCreateTemplateResp,
  AdminDeleteTemplateResp,
  AdminGetConfigResp,
  AdminListTemplateQuery,
  AdminListTemplateResp,
  AdminListUsersQuery,
  AdminListUsersResp,
  AdminLoginReq,
  AdminLoginResp,
  AdminStatsResp,
  AdminToggleStatusReq,
  AdminToggleStatusResp,
  AdminUpdateConfigReq,
  AdminUpdateConfigResp,
  AdminUpdateTemplateReq,
  AdminUpdateTemplateResp,
} from "@/types/api";

export const adminApi = {
  /** 管理员登录（不带 token） */
  login: (body: AdminLoginReq) =>
    http.post<AdminLoginResp["data"]>("/api/v1/admin/auth/login", body, { skipAuth: true }),

  templates: {
    list: (q: AdminListTemplateQuery = {}) =>
      adminHttp.get<AdminListTemplateResp["data"]>("/api/v1/admin/templates", q as any),
    create: (body: AdminCreateTemplateReq) =>
      adminHttp.post<AdminCreateTemplateResp["data"]>("/api/v1/admin/templates", body),
    update: (id: string, body: AdminUpdateTemplateReq) =>
      adminHttp.put<AdminUpdateTemplateResp["data"]>(`/api/v1/admin/templates/${id}`, body),
    toggleStatus: (id: string, body: AdminToggleStatusReq) =>
      adminHttp.patch<AdminToggleStatusResp["data"]>(`/api/v1/admin/templates/${id}/status`, body),
    delete: (id: string) =>
      adminHttp.delete<AdminDeleteTemplateResp["data"]>(`/api/v1/admin/templates/${id}`),
  },

  users: {
    list: (q: AdminListUsersQuery = {}) =>
      adminHttp.get<AdminListUsersResp["data"]>("/api/v1/admin/users", q as any),
  },

  pointsConfig: {
    list: () =>
      adminHttp.get<AdminGetConfigResp["data"]>("/api/v1/admin/points-config"),
    update: (key: string, body: AdminUpdateConfigReq) =>
      adminHttp.put<AdminUpdateConfigResp["data"]>(
        `/api/v1/admin/points-config/${key}`,
        body,
      ),
  },

  stats: () => adminHttp.get<AdminStatsResp["data"]>("/api/v1/admin/stats"),
};
