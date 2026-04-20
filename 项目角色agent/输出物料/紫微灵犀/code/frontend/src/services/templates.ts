import { http } from "@/utils/request";
import type {
  GetTemplateResp,
  ListMyTemplatesResp,
  ListTemplateQuery,
  ListTemplateResp,
  UnlockTemplateResp,
} from "@/types/api";

export const templateApi = {
  list: (q: ListTemplateQuery = {}) =>
    http.get<ListTemplateResp["data"]>("/api/v1/templates", q as any),
  detail: (id: string) =>
    http.get<GetTemplateResp["data"]>(`/api/v1/templates/${id}`),
  unlock: (id: string) =>
    http.post<UnlockTemplateResp["data"]>(`/api/v1/templates/${id}/unlock`),
  myTemplates: (q: ListTemplateQuery = {}) =>
    http.get<ListMyTemplatesResp["data"]>("/api/v1/user/templates", q as any),
};
