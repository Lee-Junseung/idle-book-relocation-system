// 점검 "완료 결과" 관련 API
import { apiGet, apiPost, apiPut, USE_MOCK } from "./client";
import { Book, BookStatus } from "../types";
import {
    ApiBookStatus,
    BookDetailResult,
    ChecklistHistoryEntry,
    ChecklistHistoryResponse,
    CheckItemListResponse,
    CheckItemMaster,
    CompletedChecklistItem,
    CompletedChecklistListResponse,
    ConfirmDecisionData,
    ConfirmDecisionRequest,
    ConfirmDecisionResponse,
    ConfirmDecisionsRequest,
    ConfirmDecisionsResponse,
    CreateCheckItemRequest,
    CreateCheckItemResponse,
    DecisionType,
    MonthlyLoanTrendItem,
    MonthlyLoanTrendResponse,
    UpdateChecklistResultData,
    UpdateChecklistResultRequest,
    UpdateChecklistResultResponse,
} from "../types/resultChecklist";
import {
    getCompletedChecklistsApiMock,
    getBookDetailApiMock,
    getBookHistoryApiMock,
    updateChecklistResultApiMock,
    createCheckItemApiMock,
    getCheckItemsApiMock,
    confirmDecisionApiMock,
    confirmDecisionsApiMock,
    getMonthlyLoanTrendApiMock,
} from "./resultChecklistMock";

// 점검 완료 도서 전체 목록 조회 (GET /api/checklists/results/completed)
// 이 엔드포인트만 래핑 없이 배열을 그대로 반환합니다.
export const getCompletedChecklistsApi = (): Promise<CompletedChecklistListResponse> =>
    USE_MOCK
        ? getCompletedChecklistsApiMock()
        : apiGet<CompletedChecklistListResponse>("/api/checklists/results/completed");

// totalScore(감점 총점 추정, 0~100 가정)를 화면의 1~5 마모 단계로 환산합니다.
// 문항별 만점(maxScore) 합계 — 15개 항목 × 1~5점 = 75점 만점.
export const MAX_TOTAL_SCORE = 75;

export function scoreToDamage(totalScore: number): 1 | 2 | 3 | 4 | 5 {
    const clamped = Math.max(0, Math.min(MAX_TOTAL_SCORE, totalScore));
    const level = Math.ceil((clamped / MAX_TOTAL_SCORE) * 5);
    return Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
}

export function apiStatusToBookStatus(status: ApiBookStatus): BookStatus {
    switch (status) {
        case "DISCARDED": return "폐기승인";
        case "TRANSFERRED": return "이관승인";
        case "PRESERVED": return "보존결정";
        default: return "대기";
    }
}


// 목록 API가 branch 필드는 내려주지 않아 페이지 지점명으로 임시 고정합니다.
// genre / isbn / turnoverRate는 API가 내려주므로(nullable 값 포함) 그대로 매핑합니다.
// @param currentBranchName 이 페이지가 속한 지점명 (API에 지점 정보가 없어 고정값으로 채움)
export function mapCompletedItemToBook(
    item: CompletedChecklistItem,
    currentBranchName: string
): Book {
    return {
        id: String(item.bookId),
        title: item.title,
        author: item.author,
        genre: item.genre ?? "미분류",
        isbn: item.isbn,
        branch: currentBranchName, // TODO: API에 지점 정보 없음 — 이 페이지 지점으로 임시 고정
        damage: scoreToDamage(item.totalScore),
        turnover: item.turnoverRate ?? 0,
        lastLoan: item.checkedDate,
        status: apiStatusToBookStatus(item.status),
    } as Book;
}

// 도서 상세 조회 (최근 1건) (GET /api/checklists/books/{bookId}/results)
// 이 엔드포인트도 래핑 없이 객체를 그대로 반환합니다.
export const getBookDetailApi = (bookId: number): Promise<BookDetailResult> =>
    USE_MOCK
        ? getBookDetailApiMock(bookId)
        : apiGet<BookDetailResult>(`/api/checklists/books/${bookId}/results`);

// 도서 점검 전체 이력 리스트 조회 (GET /api/checklists/books/{bookId}/results/history)
export const getBookHistoryApi = async (bookId: number): Promise<ChecklistHistoryEntry[]> => {
    if (USE_MOCK) return getBookHistoryApiMock(bookId);
    const envelope = await apiGet<ChecklistHistoryResponse>(
        `/api/checklists/books/${bookId}/results/history`
    );
    return envelope.data;
};

// 점검 결과 수정 (PUT /api/checklists/results/{resultBatchId})
export const updateChecklistResultApi = async (
    resultBatchId: number,
    body: UpdateChecklistResultRequest
): Promise<UpdateChecklistResultData> => {
    if (USE_MOCK) return updateChecklistResultApiMock(resultBatchId, body);
    const envelope = await apiPut<UpdateChecklistResultResponse>(
        `/api/checklists/results/${resultBatchId}`,
        body
    );
    return envelope.data;
};

// 점검 항목(CheckItem) 등록 (POST — 관리자/시딩용, 이 페이지 미사용)
export const createCheckItemApi = async (
    body: CreateCheckItemRequest
): Promise<{ checkItemId: number }> => {
    if (USE_MOCK) return createCheckItemApiMock(body);
    const envelope = await apiPost<CreateCheckItemResponse>("/api/checklists/check-items", body);
    return envelope.data;
};

// 점검 항목(CheckItem) 전체 조회 (GET /api/checklists/check-items)
export const getCheckItemsApi = async (): Promise<CheckItemMaster[]> => {
    if (USE_MOCK) return getCheckItemsApiMock();
    const envelope = await apiGet<CheckItemListResponse>("/api/checklists/check-items");
    return envelope.data;
};

// 화면의 처리 상태(BookStatus)를 결정 확정 API의 decision 값으로 변환합니다.
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

// 폐기/이관/보존 결정 확정 — PUT /api/checklists/results/{resultBatchId}/decision
// 실제 응답은 { status, message, data: {...} } 형태로 감싸져 온다 (2026-08-06 실응답 확인 — 이전 문서/코멘트가 오기였음).
export const confirmDecisionApi = async (
    resultBatchId: number,
    body: ConfirmDecisionRequest
): Promise<ConfirmDecisionData> => {
    if (USE_MOCK) return confirmDecisionApiMock(resultBatchId, body);
    const envelope = await apiPut<ConfirmDecisionResponse>(
        `/api/checklists/results/${resultBatchId}/decision`,
        body
    );
    return envelope.data;
};

// 폐기/이관/보존 결정 확정 (일괄) — PUT /api/checklists/results/decisions
// 이 엔드포인트는 배열을 그대로 반환합니다 (ApiEnvelope 래핑 없음)
export const confirmDecisionsApi = (
    body: ConfirmDecisionsRequest
): Promise<ConfirmDecisionsResponse> =>
    USE_MOCK
        ? confirmDecisionsApiMock(body)
        : apiPut<ConfirmDecisionsResponse>("/api/checklists/results/decisions", body);

// 도서 월별 대출 추이 조회 (GET /api/checklists/books/{bookId}/loans/monthly)
export const getMonthlyLoanTrendApi = async (bookId: number): Promise<MonthlyLoanTrendItem[]> => {
    if (USE_MOCK) return getMonthlyLoanTrendApiMock(bookId);
    const envelope = await apiGet<MonthlyLoanTrendResponse>(
        `/api/checklists/books/${bookId}/loans/monthly`
    );
    return envelope.data;
};
