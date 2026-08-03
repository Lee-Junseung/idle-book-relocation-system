import { apiGet, apiPost, USE_MOCK } from "./client";
import { Book, DamageInspection } from "../types";
import { INSP_ITEMS_FLAT } from "../constants/checklistItems";
import {
    ChecklistListItem,
    ChecklistListResponse,
    ChecklistRegisterRequest,
    ChecklistRegisterResponse,
    ChecklistStatus,
    IdleClassifyResponse,
} from "../types/checklists";
import {
    getChecklistListApiMock,
    registerChecklistApiMock,
    classifyIdleBooksApiMock,
} from "./checklistsMock";

// 마모 점검 대상 도서 목록 조회 (GET /api/checklists?status=&page=&size=)
export const getChecklistListApi = (
    status: ChecklistStatus,
    page: number,
    size: number
): Promise<ChecklistListResponse> => {
    if (USE_MOCK) return getChecklistListApiMock(status, page, size);
    const params = new URLSearchParams({ status, page: String(page), size: String(size) });
    return apiGet<ChecklistListResponse>(`/api/checklists?${params.toString()}`);
};

export function mapToBook(item: ChecklistListItem): Book {
    return {
        id: String(item.resultId),
        title: item.bookTitle,
        author: item.author,
        isbn: item.isbn,
        genre: item.genre,
        branch: "",
        lastLoan: "",
        damage: 0 as Book["damage"],
        turnover: 0,
        copies: 0,
        status: "대기",
        idleScore: item.idleScore,
        sage: item.sage,
        sloan: item.sloan,
        sdecay: item.sdecay,
    };
}

// 점검 결과 등록 (POST /api/checklists/results)
export const registerChecklistApi = (
    body: ChecklistRegisterRequest
): Promise<ChecklistRegisterResponse> =>
    USE_MOCK ? registerChecklistApiMock(body) : apiPost<ChecklistRegisterResponse>("/api/checklists/results", body);

// isPassed 기준(1~2점=양호)
export function buildChecklistRegisterRequest(
    bookId: string,
    insp: DamageInspection,
    librarianCode: string
): ChecklistRegisterRequest {
    const checkResults = INSP_ITEMS_FLAT.map(({ key, checkItemId }) => ({
        checkItemId,
        itemScore: insp[key],
        isPassed: insp[key] <= 2,
    }));

    const totalScore = checkResults.reduce((sum, r) => sum + r.itemScore, 0);

    return {
        resultId: Number(bookId),
        librarianCode,
        checkedDate: insp.date,
        totalScore,
        checkResults,
    };
}

// 유휴화 도서 재산정 (POST /api/checklists/idle-classify)
// 요청 바디 없음.
// WearQueuePage의 "유휴화 도서 새로고침" 버튼에서 호출한 뒤 getChecklistListApi로 1페이지부터 목록을 다시 조회하는 방식으로 사용.
export const classifyIdleBooksApi = (): Promise<IdleClassifyResponse> =>
    USE_MOCK
        ? classifyIdleBooksApiMock()
        : apiPost<IdleClassifyResponse>("/api/checklists/idle-classify", undefined);
