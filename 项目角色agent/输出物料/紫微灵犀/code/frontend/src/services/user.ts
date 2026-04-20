import { http } from "@/utils/request";
import type {
  GetMeResp,
  GetProfileResp,
  UpsertProfileReq,
  UpsertProfileResp,
} from "@/types/api";

export const userApi = {
  me: () => http.get<GetMeResp["data"]>("/api/v1/user/me"),
  getProfile: () => http.get<GetProfileResp["data"]>("/api/v1/user/profile"),
  upsertProfile: (body: UpsertProfileReq) =>
    http.put<UpsertProfileResp["data"]>("/api/v1/user/profile", body),
};
