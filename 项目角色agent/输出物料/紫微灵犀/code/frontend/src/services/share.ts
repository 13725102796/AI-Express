import { http } from "@/utils/request";
import type { CreateShareResp, GetShareResp } from "@/types/api";

export const shareApi = {
  create: (reportId: string) =>
    http.post<CreateShareResp["data"]>(
      `/api/v1/reading/reports/${reportId}/share`,
    ),
  get: (token: string) =>
    http.get<GetShareResp["data"]>(`/api/v1/share/${token}`),
};
