import { http } from "@/utils/request";
import type { GenerateChartResp, GetMyChartResp } from "@/types/api";

export const chartApi = {
  generate: () =>
    http.post<GenerateChartResp["data"]>("/api/v1/chart/generate"),
  me: () => http.get<GetMyChartResp["data"]>("/api/v1/chart/me"),
};
