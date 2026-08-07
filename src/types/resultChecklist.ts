// 점검 "완료 결과" 조회/수정/이력/마스터/결정확정(WearManagePage) API의 요청·응답 타입
export interface ApiEnvelope<T> {
  status: "SUCCESS" | "ERROR";
  message: string;
  data: T;
}

// 도서 상태 (백엔드 원본 값).
// 화면에서 쓰는 "폐기/이관/보존 결정" 상태(BookStatus)와는 별개의 개념입니다.
// NORMAL: 정상 / IDLE: 유휴(장기 미대출 등) / IN_PROGRESS: 점검 진행중 / DISCARDED: 폐기 완료 / TRANSFERRED: 이관 완료 / PRESERVED: 보존 완료
export type ApiBookStatus = "NORMAL" | "IDLE" | "IN_PROGRESS" | "DISCARDED" | "TRANSFERRED" | "PRESERVED";

// 점검 완료 도서 전체 목록 조회
// GET /api/checklists/results/completed
// 이 엔드포인트만 배열을 그대로 반환합니다 (status/data 래핑 없음)
export interface CompletedChecklistItem {
  resultBatchId: number;
  bookId: number;
  title: string;
  author: string;
  publisher: string;
  genre: string | null;      // nullable
  isbn: string;
  callNumber: string | null; // 실제 응답에서 null로 내려오는 경우 확인됨
  coverUrl: string | null;   // 실제 응답에서 null로 내려오는 경우 확인됨
  turnoverRate: number | null; // nullable — 도서 회전율(이용 빈도)
  checkedDate: string; // "2026-08-01"
  librarianName: string;
  totalScore: number;
  status: ApiBookStatus;
}

export type CompletedChecklistListResponse = CompletedChecklistItem[];

// 도서 상세 조회 (가장 최근 점검 1건)
// GET /api/checklists/books/{bookId}/results
// 이 엔드포인트도 래핑 없이 객체를 그대로 반환합니다.
// 점검 이력이 아예 없는 도서를 조회하면 서버 에러(현재는 500)가 발생할 수 있습니다.
export interface CheckResultItem {
  checkItemId: number;
  title: string;
  isPassed: boolean;
  itemScore: number;
  note: string;
}

export interface BookInfo {
  bookId: number;
  title: string;
  author: string;
  publisher: string;
  callNumber: string | null; // 실제 응답에서 null로 내려오는 경우 확인됨
  coverUrl: string | null;   // 실제 응답에서 null로 내려오는 경우 확인됨
  status: ApiBookStatus;
}

export interface BookDetailResult {
  resultBatchId: number;
  checkedDate: string;
  librarianCode: string;
  totalScore: number;
  bookInfo: BookInfo;
  checkResults: CheckResultItem[];
}

// 도서 점검 전체 이력 리스트 조회 (최신순)
// GET /api/checklists/books/{bookId}/results/history
export interface HistoryCheckItemResult {
  checkItemId: number;
  title: string;
  category: string;
  description: string;
  isPassed: boolean;
  note: string;
}

export interface ChecklistHistoryEntry {
  resultBatchId: number;
  bookId: number;
  librarianCode: string;
  checkedDate: string;
  totalScore: number;
  items: HistoryCheckItemResult[];
}

export type ChecklistHistoryResponse = ApiEnvelope<ChecklistHistoryEntry[]>;

// 점검 결과 수정
// PUT /api/checklists/results/{resultBatchId}
// Request Body: 1번(등록)과 동일 형식(checkResults, itemScore 포함)
export interface UpdateCheckResultInput {
  checkItemId: number;
  isPassed: boolean;
  itemScore: number;
  note?: string;
}

export interface UpdateChecklistResultRequest {
  // Postman 캡처(PUT /checklists/results/{id}) 기준으로 실제 요청에 포함되어 있던 필드입니다.
  bookId: number;
  librarianCode: string;
  checkedDate: string; // "2026-08-02"
  totalScore: number;
  checkResults: UpdateCheckResultInput[];
}

export interface UpdateChecklistResultData {
  resultBatchId: number;
  totalScore: number;
  updatedAt: string;
}

export type UpdateChecklistResultResponse = ApiEnvelope<UpdateChecklistResultData>;

// 점검 항목(CheckItem) 등록 (관리자/시딩용 — 이 페이지에서는 미사용)
// POST /api/checklists/check-items
export interface CreateCheckItemRequest {
  title: string;
  category: string;
  description: string;
  maxScore: number;
}

export type CreateCheckItemResponse = ApiEnvelope<{ checkItemId: number }>;

// 점검 항목(CheckItem) 전체 조회
// GET /api/checklists/check-items
export interface CheckItemMaster {
  id: number;
  title: string;
  category: string;
  description: string;
  maxScore: number;
}

export type CheckItemListResponse = ApiEnvelope<CheckItemMaster[]>;

// 폐기/이관/보존 결정 확정
// PUT /api/checklists/results/{resultBatchId}/decision
export type DecisionType = "DISPOSAL" | "RELOCATION" | "KEEP";

export interface ConfirmDecisionRequest {
  decision: DecisionType;
  librarianCode: string;
  decidedDate: string; // "yyyy-MM-dd"
}

export interface ConfirmDecisionData {
  resultBatchId: number;
  decision: DecisionType;
  decidedAt: string;
}

export type ConfirmDecisionResponse = ApiEnvelope<ConfirmDecisionData>;

// 폐기/이관/보존 결정 확정 (일괄) — PUT /api/checklists/results/decisions
// 여러 resultBatchId를 한 번에 결정 확정할 때 사용.
// 단건 API(위 ConfirmDecisionRequest)와 달리 이 엔드포인트는 ApiEnvelope 래핑 없이 배열을 그대로 반환합니다.
export interface ConfirmDecisionsRequestItem {
  resultBatchId: number;
  decision: DecisionType;
}

export interface ConfirmDecisionsRequest {
  items: ConfirmDecisionsRequestItem[];
}

export type ConfirmDecisionsResponse = ConfirmDecisionData[];

// 도서 월별 대출 추이 조회
// GET /api/checklists/books/{bookId}/loans/monthly
// - 오래된 달 → 최근 달 순으로 이미 정렬되어 내려옴 (클라이언트에서 재정렬 불필요)
// - 배열 길이가 항상 12개는 아님 (스냅샷 데이터가 부족하면 더 적게, 0개일 수도 있음)
export interface MonthlyLoanTrendItem {
  month: string; // "YY.MM" 형식, 예: "25.07" = 2025년 7월
  v: number; // 해당 월 실제 대출 건수 (0 이상)
}

export type MonthlyLoanTrendResponse = ApiEnvelope<MonthlyLoanTrendItem[]>;
