import { apiGet, apiPost, USE_MOCK } from "./client";
import { TransferListResponse, TransferStatus } from "../types/transfers";
import { getTransferListApiMock, executeTransferApiMock } from "./transfersMock";

// 이관 추천 목록 조회 (GET /api/transfers?status=PENDING,IN_TRANSIT&page=&size=)
export const getTransferListApi = (
  statuses: TransferStatus[],
  page: number,
  size: number
): Promise<TransferListResponse> => {
  if (USE_MOCK) return getTransferListApiMock(statuses, page, size);
  const params = new URLSearchParams({
    status: statuses.join(","),
    page: String(page),
    size: String(size),
  });
  return apiGet<TransferListResponse>(`/api/transfers?${params.toString()}`);
};

// 이관 실행 (POST /api/transfers/{recommendationId}/execute)
// 요청 바디 없음. 성공 시 응답 바디도 없이 HTTP 200만 내려온다.
export const executeTransferApi = (recommendationId: number): Promise<void> =>
  USE_MOCK
    ? executeTransferApiMock(recommendationId)
    : apiPost<void>(`/api/transfers/${recommendationId}/execute`, undefined);
