// src/types/checklistApi.ts
// 점검(Checklist) 관련 API 요청/응답 타입 + 로컬 화면 모델(Book/DamageInspection) 매핑 헬퍼
// 근거 문서: 사서용 점검 API 명세 2~7번 항목

import { Book, BookStatus } from "./index";

// ------------------------------------------------------------------
// 공통
// ------------------------------------------------------------------

/** status/data 로 감싸는 엔드포인트(4,5,6,7번)에서 사용하는 표준 응답 포맷 */
export interface ApiEnvelope<T> {
  status: "SUCCESS" | "ERROR";
  message: string;
  data: T;
}

/**
 * 도서 상태 (백엔드 원본 값).
 * 화면에서 쓰는 "폐기/이관/보존 결정" 상태(BookStatus)와는 별개의 개념입니다.
 * NORMAL: 정상 / IDLE: 유휴(장기 미대출 등) / IN_PROGRESS: 점검 진행중 / DISCARDED: 폐기 완료
 */
export type ApiBookStatus = "NORMAL" | "IDLE" | "IN_PROGRESS" | "DISCARDED";

// ------------------------------------------------------------------
// 2. 점검 완료 도서 전체 목록 조회
//    GET /api/checklists/results/completed
//    ⚠️ 이 엔드포인트만 배열을 그대로 반환합니다 (status/data 래핑 없음)
// ------------------------------------------------------------------

export interface CompletedChecklistItem {
  resultBatchId: number;
  bookId: number;
  title: string;
  author: string;
  publisher: string;
  genre: string | null;        // ⚠️ 응답 필드로 확인됨 (스펙 캡처 기준) — nullable
  isbn: string | null;         // ⚠️ 응답 필드로 확인됨 (스펙 캡처 기준) — nullable
  callNumber: string | null; // ⚠️ 실제 응답에서 null로 내려오는 경우 확인됨 (Postman 캡처 기준)
  coverUrl: string | null;   // ⚠️ 실제 응답에서 null로 내려오는 경우 확인됨 (Postman 캡처 기준)
  turnoverRate: number | null; // ⚠️ 응답 필드로 확인됨 (스펙 캡처 기준) — nullable, 화면 turnover에 매핑
  checkedDate: string; // "2026-08-01"
  librarianName: string;
  totalScore: number;
  status: ApiBookStatus;
}

export type CompletedChecklistListResponse = CompletedChecklistItem[];

// ------------------------------------------------------------------
// 3. 도서 상세 조회 (가장 최근 점검 1건)
//    GET /api/checklists/books/{bookId}/results
//    ⚠️ 이 엔드포인트도 래핑 없이 객체를 그대로 반환합니다.
//    ⚠️ 점검 이력이 아예 없는 도서를 조회하면 서버 에러(현재는 500)가 발생할 수 있습니다.
// ------------------------------------------------------------------

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
  callNumber: string | null; // ⚠️ 실제 응답에서 null로 내려오는 경우 확인됨 (Postman 캡처 기준)
  coverUrl: string | null;   // ⚠️ 실제 응답에서 null로 내려오는 경우 확인됨 (Postman 캡처 기준)
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

// ------------------------------------------------------------------
// 4. 도서 점검 전체 이력 리스트 조회 (최신순)
//    GET /api/checklists/books/{bookId}/results/history
//    (현재 이 페이지 UI에는 아직 노출하지 않음 — API 함수만 준비)
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// 5. 점검 결과 수정
//    PUT /api/checklists/results/{resultBatchId}
//    Request Body: 1번(등록)과 동일 형식(checkResults, itemScore 포함)
// ------------------------------------------------------------------

export interface UpdateCheckResultInput {
  checkItemId: number;
  isPassed: boolean;
  itemScore: number;
  note?: string;
}

export interface UpdateChecklistResultRequest {
  // ⚠️ Postman 캡처(PUT /checklists/results/{id}) 기준으로 실제 요청에 포함되어 있던 필드입니다.
  //    명세서 원문에 필수/선택 여부가 명시되어 있지 않아, 우선 캡처에서 확인된 값을 그대로 채워 보냅니다.
  //    (bookId 불일치, totalScore 계산 기준 등은 README의 "백엔드 확인 필요" 항목 참고)
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

// ------------------------------------------------------------------
// 6. 점검 항목(CheckItem) 등록 (관리자/시딩용 — 이 페이지에서는 미사용)
//    POST /api/checklists/check-items
// ------------------------------------------------------------------

export interface CreateCheckItemRequest {
  title: string;
  category: string;
  description: string;
  maxScore: number;
}

export type CreateCheckItemResponse = ApiEnvelope<{ checkItemId: number }>;

// ------------------------------------------------------------------
// 7. 점검 항목(CheckItem) 전체 조회
//    GET /api/checklists/check-items
// ------------------------------------------------------------------

export interface CheckItemMaster {
  id: number;
  title: string;
  category: string;
  description: string;
  maxScore: number;
}

export type CheckItemListResponse = ApiEnvelope<CheckItemMaster[]>;

// ------------------------------------------------------------------
// 8. 폐기/이관/보존 결정 확정 (프론트 설계안 — 백엔드 확정 전)
//    PUT /api/checklists/results/{resultBatchId}/decision
//    ⚠️ 로컬 상태로만 관리하던 기능을 실제 서버 저장으로 전환하기 위해
//       새로 설계한 엔드포인트입니다. 동일 목적의 기존 API가 있다면
//       이 부분을 그것으로 교체해야 합니다.
// ------------------------------------------------------------------

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

/** 화면의 처리 상태(BookStatus)를 결정 확정 API의 decision 값으로 변환합니다. */
export function bookStatusToDecision(status: Exclude<BookStatus, "대기">): DecisionType {
  switch (status) {
    case "폐기승인":
      return "DISPOSAL";
    case "이관승인":
      return "RELOCATION";
    case "보존결정":
      return "KEEP";
  }
}

// ------------------------------------------------------------------
// 프론트 공통 에러 타입
//
//    백엔드에 아직 전역 예외 핸들러(@RestControllerAdvice)가 없어서, 없는
//    bookId / checkItemId / resultBatchId 를 조회·수정할 때도 통일된
//    { status: "ERROR", message } 포맷이 아니라 Spring 기본 에러 페이지
//    (500 + HTML/스택트레이스)가 그대로 내려올 수 있습니다.
//
//    → 이번 작업에서는 "프론트에서 500 응답도 별도로 감지/처리" 하는
//      방식(옵션 2)으로 대응합니다. JSON 파싱이 실패하는 500 응답은
//      "해당 리소스가 존재하지 않을 수 있음"으로 간주해 사용자에게
//      우호적인 메시지로 변환해서 보여줍니다.
// ------------------------------------------------------------------

export type ChecklistApiErrorKind =
  | "NOT_FOUND_LIKELY" // JSON이 아닌 500 응답 — 존재하지 않는 리소스 요청으로 추정
  | "SERVER_ERROR"      // 그 외 500 (JSON 에러 바디가 있는 경우 포함)
  | "CLIENT_ERROR"      // 400번대
  | "NETWORK_ERROR"     // fetch 자체 실패 (네트워크 단절 등)
  | "UNKNOWN";

export class ChecklistApiError extends Error {
  readonly kind: ChecklistApiErrorKind;
  readonly httpStatus?: number;
  readonly rawBody?: string;

  constructor(
    message: string,
    kind: ChecklistApiErrorKind,
    httpStatus?: number,
    rawBody?: string
  ) {
    super(message);
    this.name = "ChecklistApiError";
    this.kind = kind;
    this.httpStatus = httpStatus;
    this.rawBody = rawBody;
  }
}

// ------------------------------------------------------------------
// 로컬 화면 모델(Book) 매핑 헬퍼
//
//    ⚠️ 목록 API(2번)는 genre / isbn / branch / turnover 같은 필드를
//       내려주지 않습니다. 도서 마스터 정보를 위한 별도 API가 아직
//       없어서, 아래 매핑에서는 임시값으로 채웁니다. 도서 마스터 API가
//       추가되면 이 부분을 교체해야 합니다.
// ------------------------------------------------------------------

/**
 * totalScore(감점 총점 추정, 0~100 가정)를 화면의 1~5 마모 단계로 환산합니다.
 * ⚠️ 만점 기준이 문서에 명시되어 있지 않아 100점 만점으로 임시 가정했습니다.
 *    실제 만점 기준(check-item maxScore 합계 등)이 확정되면 교체가 필요합니다.
 */
export function scoreToDamage(totalScore: number): 1 | 2 | 3 | 4 | 5 {
  const clamped = Math.max(0, Math.min(100, totalScore));
  const level = Math.ceil((clamped / 100) * 5);
  return Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
}

/** API의 도서 상태를 화면의 처리 상태(BookStatus)로 최대한 근사 매핑합니다. */
export function apiStatusToBookStatus(status: ApiBookStatus): BookStatus {
  // 폐기/이관/보존 "결정"을 확정 처리하는 API가 아직 없으므로, DISCARDED만
  // 이미 폐기된 것으로 간주하고 나머지는 전부 "대기"로 시작합니다.
  return status === "DISCARDED" ? "폐기승인" : "대기";
}

/**
 * 목록 조회(2번) 응답 1건을 화면에서 쓰는 Book 모델로 변환합니다.
 * @param currentBranchName 이 페이지가 속한 지점명 (API에 지점 정보가 없어 고정값으로 채움)
 */
export function mapCompletedItemToBook(
  item: CompletedChecklistItem,
  currentBranchName: string
): Book {
  return {
    id: String(item.bookId),
    title: item.title,
    author: item.author,
    genre: item.genre ?? "미분류", // API가 genre를 내려주지만 nullable이라 null이면 폴백
    isbn: item.isbn ?? "", // API가 isbn을 내려주지만 nullable이라 null이면 폴백
    branch: currentBranchName, // TODO: API에 지점 정보 없음 — 이 페이지 지점으로 임시 고정
    damage: scoreToDamage(item.totalScore),
    turnover: item.turnoverRate ?? 0, // API가 turnoverRate를 내려주지만 nullable이라 null이면 폴백
    lastLoan: item.checkedDate,
    status: apiStatusToBookStatus(item.status),
  } as Book;
}