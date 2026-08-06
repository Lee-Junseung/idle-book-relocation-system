import { apiGet, apiPost, USE_MOCK } from "./client";
import { Book, DamageInspection } from "../types";
import { INSP_ITEMS_FLAT } from "../constants/checklistItems";
import {
    ChecklistListItem,
    ChecklistListQuery,
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

// 마모 점검 대상 도서 목록 조회 (GET /api/checklists?status=&keyword=&genre=&sortOrder=&page=&size=)
// keyword(검색어)/genre(장르 필터)/sortOrder(유휴화 점수 정렬)는 서버로 그대로 전달한다.
// 서버가 전체 데이터 기준으로 검색·필터·정렬한 뒤 페이지 단위로 잘라서 내려주므로, 현재 페이지(10건) 안에서만 걸러지는 문제 없이 항상 페이지당 10건이 유지된다.
export const getChecklistListApi = (
    status: ChecklistStatus,
    page: number,
    size: number,
    query: ChecklistListQuery = {},
    signal?: AbortSignal
): Promise<ChecklistListResponse> => {
    if (USE_MOCK) return getChecklistListApiMock(status, page, size, query);
    const params = new URLSearchParams({ status, page: String(page), size: String(size) });
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.genre) params.set("genre", query.genre);
    if (query.sortOrder) params.set("sortOrder", query.sortOrder);
    return apiGet<ChecklistListResponse>(`/api/checklists?${params.toString()}`, signal);
};

export function mapToBook(item: ChecklistListItem): Book {
    return {
        id: String(item.bookId),
        resultId: item.resultId,
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
        sage: item.sAge,
        sloan: item.sLoan,
        sdecay: item.sDecay,
    };
}

// 점검 결과 등록 (POST /api/checklists/results)
export const registerChecklistApi = (
    body: ChecklistRegisterRequest
): Promise<ChecklistRegisterResponse> =>
    USE_MOCK ? registerChecklistApiMock(body) : apiPost<ChecklistRegisterResponse>("/api/checklists/results", body);

// isPassed 기준(1~2점=양호)
export function buildChecklistRegisterRequest(
    resultId: number,
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
        resultId,
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
