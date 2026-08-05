// [폐기 도서 목록] 화면 (GET /api/checklists/discarded) 요청·응답 타입
// 백엔드: BookWearStatusController#getDiscardedBooks / BookWearStatusService#getDiscardedBooksWithQuota
import { ApiEnvelope } from "./resultChecklist";

// BookSummaryResponseDto와 1:1 대응 (백엔드가 폐기 확정된 Book 엔티티를 그대로 요약해 내려줌)
export interface DiscardedBookItem {
  bookId: number;
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  kdcCode: string | null;
  kdcClass: string | null; // "0"~"9" 한 자리 — KDC_GENRES 인덱스와 매핑
  callNumber: string | null;
  coverUrl: string | null;
  status: string; // "DISCARDED" 고정값이지만 백엔드 원본 타입을 그대로 문자열로 받음
}

// 도서관법 시행령 [별표 7] 제3호 기준 연간 폐기 상한(전체 장서 × 7%) 현황.
// DiscardQuotaDto와 1:1 대응.
export interface DiscardQuota {
  totalBooks: number;
  discardedCount: number;
  capCount: number;
  capRatio: number; // 0.07
  remaining: number;
  capReached: boolean;
}

export interface DiscardedBookListData {
  books: DiscardedBookItem[];
  quota: DiscardQuota;
}

// GET /api/checklists/discarded 응답 — 다른 checklists 엔드포인트와 동일한 {status,message,data} 래핑
export type DiscardedBookListResponse = ApiEnvelope<DiscardedBookListData>;
