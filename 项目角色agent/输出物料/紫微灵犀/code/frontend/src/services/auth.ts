/**
 * 认证相关 API（对齐 tech-architecture.md + shared-types.md）
 */
import { http } from "@/utils/request";
import type {
  LoginReq,
  LoginResp,
  RefreshReq,
  RefreshResp,
  RegisterReq,
  RegisterResp,
} from "@/types/api";

export const authApi = {
  register: (body: RegisterReq) =>
    http.post<LoginResp["data"]>("/api/v1/auth/register", body, { skipAuth: true }),
  login: (body: LoginReq) =>
    http.post<LoginResp["data"]>("/api/v1/auth/login", body, { skipAuth: true }),
  refresh: (body: RefreshReq) =>
    http.post<RefreshResp["data"]>("/api/v1/auth/token/refresh", body, { skipAuth: true }),
};
