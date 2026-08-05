// 폐기 도서 목록 + 연간 폐기 상한(7%) 현황 API
import { apiGet, USE_MOCK } from "./client";
import { DiscardedBookListData, DiscardedBookListResponse } from "../types/discardedBooks";
import { getDiscardedBooksApiMock } from "./discardedBooksMock";

// GET /api/checklists/discarded
// 다른 checklists 엔드포인트(getCheckItemsApi 등)와 동일하게 {status,message,data} 래핑을 벗겨 data만 반환한다.
export const getDiscardedBooksApi = async (): Promise<DiscardedBookListData> => {
  if (USE_MOCK) return getDiscardedBooksApiMock();
  const envelope = await apiGet<DiscardedBookListResponse>("/api/checklists/discarded");
  return envelope.data;
};
