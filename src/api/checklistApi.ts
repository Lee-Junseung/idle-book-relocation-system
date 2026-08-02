// src/api/checklistApi.ts
// 점검(Checklist) 관련 실제 API 클라이언트
//
// 사용 예:
//   import * as checklistApi from "../api/checklistApi";
//   // 로컬 개발 중 백엔드가 준비 안 됐다면 아래로 교체:
//   // import * as checklistApi from "../api/checklistApiMock";

import {
    ApiEnvelope,
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

const BASE_URL =
    (import.meta as any)?.env?.VITE_CHECKLIST_API_BASE_URL ?? "/api";

/**
 * 공통 fetch 헬퍼.
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
            headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
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
export async function getCompletedChecklists(): Promise<CompletedChecklistListResponse> {
    return request<CompletedChecklistListResponse>("/checklists/results/completed");
}

/** 3. 도서 상세 조회 (최근 1건) — GET /api/checklists/books/{bookId}/results */
export async function getBookDetail(bookId: number): Promise<BookDetailResult> {
    return request<BookDetailResult>(`/checklists/books/${bookId}/results`);
}

/** 4. 도서 점검 전체 이력 리스트 조회 — GET /api/checklists/books/{bookId}/results/history */
export async function getBookHistory(bookId: number): Promise<ChecklistHistoryEntry[]> {
    const envelope = await request<ChecklistHistoryResponse>(
        `/checklists/books/${bookId}/results/history`
    );
    return envelope.data;
}

/** 5. 점검 결과 수정 — PUT /api/checklists/results/{resultBatchId} */
export async function updateChecklistResult(
    resultBatchId: number,
    body: UpdateChecklistResultRequest
): Promise<UpdateChecklistResultData> {
    const envelope = await request<UpdateChecklistResultResponse>(
        `/checklists/results/${resultBatchId}`,
        { method: "PUT", body: JSON.stringify(body) }
    );
    return envelope.data;
}

/** 6. 점검 항목(CheckItem) 등록 — POST /api/checklists/check-items (관리자/시딩용, 이 페이지 미사용) */
export async function createCheckItem(
    body: CreateCheckItemRequest
): Promise<{ checkItemId: number }> {
    const envelope = await request<CreateCheckItemResponse>("/checklists/check-items", {
        method: "POST",
        body: JSON.stringify(body),
    });
    return envelope.data;
}

/** 7. 점검 항목(CheckItem) 전체 조회 — GET /api/checklists/check-items */
export async function getCheckItems(): Promise<CheckItemMaster[]> {
    const envelope = await request<CheckItemListResponse>("/checklists/check-items");
    return envelope.data;
}