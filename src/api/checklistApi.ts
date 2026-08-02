// src/api/checklistApi.ts
// 점검(Checklist) 관련 API 클라이언트.
//
// 다른 도메인(api/auth.ts, api/dashboard.ts)과 동일하게 VITE_USE_MOCK 값에 따라
// mock(api/checklistApiMock.ts)과 실제 API 호출을 이 파일 안에서 자동으로 분기합니다.
// 화면(WearManagePage 등)에서는 항상 이 파일 하나만 import하면 되고, mock 전환을 위해
// import 경로를 직접 바꿀 필요가 없습니다.
//
//   import * as checklistApi from "../api/checklistApi";

import { BASE_URL, USE_MOCK, authHeaders, notifyUnauthorized } from "./client";
import * as mock from "./checklistApiMock";
import {
    ChecklistApiError,
    CompletedChecklistListResponse,
    BookDetailResult,
    ChecklistHistoryResponse,
    ChecklistHistoryEntry,
    UpdateChecklistResultRequest,
    UpdateChecklistResultResponse,
    UpdateChecklistResultData,
    CreateCheckItemRequest,
    CreateCheckItemResponse,
    CheckItemListResponse,
    CheckItemMaster,
} from "../types/checklistApi";

/**
 * 공통 fetch 헬퍼 (실제 API 호출 전용 — mock 모드에서는 사용되지 않음).
 *
 * - BASE_URL / 인증 헤더는 api/client.ts와 동일한 값을 그대로 재사용합니다
 *   (.env.local의 VITE_API_BASE_URL, 로그인 세션의 accessToken).
 * - 401 응답을 받으면 client.ts와 동일하게 세션을 지우고 로그인 화면으로 돌려보냅니다.
 *
 * ⚠️ 백엔드에 전역 예외 핸들러가 아직 없어서, 없는 bookId/checkItemId/
 *    resultBatchId 요청 시 통일된 { status, message } 형식이 아니라
 *    Spring 기본 500 에러 페이지(HTML)가 내려올 수 있습니다.
 *    → JSON 파싱에 실패하는 500 응답은 "리소스가 존재하지 않을 가능성이
 *      높음"으로 간주해 사용자 친화적인 메시지로 변환합니다. (프론트 대응, 옵션 2)
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${BASE_URL}${path}`, {
            headers: {
                "Content-Type": "application/json",
                ...authHeaders(),
                ...(init?.headers ?? {}),
            },
            ...init,
        });
    } catch (err) {
        throw new ChecklistApiError(
            "네트워크 연결에 실패했습니다. 인터넷 연결을 확인해 주세요.",
            "NETWORK_ERROR"
        );
    }

    const rawText = await res.text();
    let parsed: unknown = null;
    let isJson = true;
    try {
        parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
        isJson = false;
    }

    if (res.ok) {
        // 성공 응답은 항상 JSON이라고 가정합니다 (엔드포인트 2/3은 래핑 없이 그대로,
        // 4/5/6/7은 ApiEnvelope로 감싸져 있음 — 호출부에서 각각 처리)
        return parsed as T;
    }

    if (res.status === 401) {
        notifyUnauthorized();
    }

    if (!isJson) {
        if (res.status === 500) {
            throw new ChecklistApiError(
                "요청하신 데이터를 찾을 수 없거나 서버에서 오류가 발생했습니다. (존재하지 않는 항목일 수 있습니다)",
                "NOT_FOUND_LIKELY",
                500,
                rawText.slice(0, 500)
            );
        }
        throw new ChecklistApiError(
            "요청 처리 중 오류가 발생했습니다.",
            "CLIENT_ERROR",
            res.status,
            rawText.slice(0, 500)
        );
    }

    const message =
        (parsed as { message?: string } | null)?.message ??
        "요청 처리 중 오류가 발생했습니다.";
    throw new ChecklistApiError(
        message,
        res.status === 500 ? "SERVER_ERROR" : "CLIENT_ERROR",
        res.status,
        rawText.slice(0, 500)
    );
}

/** 2. 점검 완료 도서 전체 목록 조회 — GET /api/checklists/results/completed */
async function getCompletedChecklistsReal(): Promise<CompletedChecklistListResponse> {
    return request<CompletedChecklistListResponse>("/api/checklists/results/completed");
}
export const getCompletedChecklists = (): Promise<CompletedChecklistListResponse> =>
    USE_MOCK ? mock.getCompletedChecklists() : getCompletedChecklistsReal();

/** 3. 도서 상세 조회 (최근 1건) — GET /api/checklists/books/{bookId}/results */
async function getBookDetailReal(bookId: number): Promise<BookDetailResult> {
    return request<BookDetailResult>(`/api/checklists/books/${bookId}/results`);
}
export const getBookDetail = (bookId: number): Promise<BookDetailResult> =>
    USE_MOCK ? mock.getBookDetail(bookId) : getBookDetailReal(bookId);

/** 4. 도서 점검 전체 이력 리스트 조회 — GET /api/checklists/books/{bookId}/results/history */
async function getBookHistoryReal(bookId: number): Promise<ChecklistHistoryEntry[]> {
    const envelope = await request<ChecklistHistoryResponse>(
        `/api/checklists/books/${bookId}/results/history`
    );
    return envelope.data;
}
export const getBookHistory = (bookId: number): Promise<ChecklistHistoryEntry[]> =>
    USE_MOCK ? mock.getBookHistory(bookId) : getBookHistoryReal(bookId);

/** 5. 점검 결과 수정 — PUT /api/checklists/results/{resultBatchId} */
async function updateChecklistResultReal(
    resultBatchId: number,
    body: UpdateChecklistResultRequest
): Promise<UpdateChecklistResultData> {
    const envelope = await request<UpdateChecklistResultResponse>(
        `/api/checklists/results/${resultBatchId}`,
        { method: "PUT", body: JSON.stringify(body) }
    );
    return envelope.data;
}
export const updateChecklistResult = (
    resultBatchId: number,
    body: UpdateChecklistResultRequest
): Promise<UpdateChecklistResultData> =>
    USE_MOCK
        ? mock.updateChecklistResult(resultBatchId, body)
        : updateChecklistResultReal(resultBatchId, body);

/** 6. 점검 항목(CheckItem) 등록 — POST /api/checklists/check-items (관리자/시딩용, 이 페이지 미사용) */
async function createCheckItemReal(
    body: CreateCheckItemRequest
): Promise<{ checkItemId: number }> {
    const envelope = await request<CreateCheckItemResponse>("/api/checklists/check-items", {
        method: "POST",
        body: JSON.stringify(body),
    });
    return envelope.data;
}
export const createCheckItem = (
    body: CreateCheckItemRequest
): Promise<{ checkItemId: number }> =>
    USE_MOCK ? mock.createCheckItem(body) : createCheckItemReal(body);

/** 7. 점검 항목(CheckItem) 전체 조회 — GET /api/checklists/check-items */
async function getCheckItemsReal(): Promise<CheckItemMaster[]> {
    const envelope = await request<CheckItemListResponse>("/api/checklists/check-items");
    return envelope.data;
}
export const getCheckItems = (): Promise<CheckItemMaster[]> =>
    USE_MOCK ? mock.getCheckItems() : getCheckItemsReal();
