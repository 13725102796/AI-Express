import { http } from "@/utils/request";
import type {
  AdRewardReq,
  AdRewardResp,
  CheckinResp,
  CheckinStatusResp,
  GetBalanceResp,
  ListTxQuery,
  ListTxResp,
  ShareRewardReq,
  ShareRewardResp,
} from "@/types/api";

export const pointsApi = {
  balance: () =>
    http.get<GetBalanceResp["data"]>("/api/v1/points/balance"),
  transactions: (q: ListTxQuery = {}) =>
    http.get<ListTxResp["data"]>("/api/v1/points/transactions", q as any),
  checkin: () => http.post<CheckinResp["data"]>("/api/v1/points/checkin"),
  checkinStatus: () =>
    http.get<CheckinStatusResp["data"]>("/api/v1/points/checkin/status"),
  shareReward: (body: ShareRewardReq) =>
    http.post<ShareRewardResp["data"]>("/api/v1/points/share-reward", body),
  adReward: (body: AdRewardReq) =>
    http.post<AdRewardResp["data"]>("/api/v1/points/ad-reward", body),
};
