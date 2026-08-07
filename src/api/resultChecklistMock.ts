// VITE_USE_MOCK=true 일 때 사용하는 목업 구현체 (WearManagePage 전용, 점검 "완료 결과" 도메인).
// checklistsMock.ts와 동일하게 client.ts의 mockDelay/hashCode를 그대로 재사용합니다.
import { ApiError, hashCode, mockDelay } from "./client";
import {
    BookDetailResult,
    ChecklistHistoryEntry,
    CheckItemMaster,
    CompletedChecklistListResponse,
    ConfirmDecisionData,
    ConfirmDecisionRequest,
    ConfirmDecisionsRequest,
    ConfirmDecisionsResponse,
    CreateCheckItemRequest,
    MonthlyLoanTrendItem,
    UpdateChecklistResultData,
    UpdateChecklistResultRequest,
} from "../types/resultChecklist";

// 존재하지 않는 것으로 취급할 테스트용 ID들 (500/미존재 케이스 재현용)
const NON_EXISTENT_BOOK_IDS = new Set([999999]);
const NON_EXISTENT_RESULT_BATCH_IDS = new Set([999999]);

const NOT_FOUND_MESSAGE =
    "요청하신 데이터를 찾을 수 없거나 서버에서 오류가 발생했습니다. (존재하지 않는 항목일 수 있습니다)";

const MOCK_ITEMS: CompletedChecklistListResponse = [
    {
        resultBatchId: 1,
        bookId: 1,
        title: "어린왕자",
        author: "생텍쥐페리",
        publisher: "문학동네",
        genre: "소설",
        isbn: "978-1111111111",
        callNumber: "813.6-생72ㅇ",
        coverUrl: "https://picsum.photos/seed/book1/200/280",
        turnoverRate: 2.4,
        checkedDate: "2026-08-01",
        librarianName: "LIB001",
        totalScore: 80,
        status: "IN_PROGRESS",
    },
    {
        resultBatchId: 2,
        bookId: 2,
        title: "데미안",
        author: "헤르만 헤세",
        publisher: "민음사",
        genre: "소설",
        isbn: "978-2222222222",
        callNumber: "853.6-헤44ㄷ",
        coverUrl: "https://picsum.photos/seed/book2/200/280",
        turnoverRate: 0.8,
        checkedDate: "2026-07-28",
        librarianName: "LIB002",
        totalScore: 35,
        status: "IDLE",
    },
    {
        resultBatchId: 3,
        bookId: 3,
        title: "1984",
        author: "조지 오웰",
        publisher: "민음사",
        genre: null,
        isbn: "978-3333333333",
        callNumber: "843-오96일",
        coverUrl: "https://picsum.photos/seed/book3/200/280",
        turnoverRate: null,
        checkedDate: "2026-07-20",
        librarianName: "LIB001",
        totalScore: 92,
        status: "DISCARDED",
    },
];

const MOCK_DETAILS: Record<number, BookDetailResult> = {
    1: {
        resultBatchId: 1,
        checkedDate: "2026-08-01",
        librarianCode: "LIB001",
        totalScore: 80,
        bookInfo: {
            bookId: 1,
            title: "어린왕자",
            author: "생텍쥐페리",
            publisher: "문학동네",
            callNumber: "813.6-생72ㅇ",
            coverUrl: "https://picsum.photos/seed/book1/200/280",
            status: "IN_PROGRESS",
        },
        checkResults: [
            { checkItemId: 1, title: "표지 찢어짐", isPassed: false, itemScore: 5, note: "30페이지 낙서있음" },
            { checkItemId: 2, title: "책등 파손", isPassed: true, itemScore: 0, note: "" },
            { checkItemId: 3, title: "페이지 낙서", isPassed: false, itemScore: 3, note: "형광펜 밑줄 다수" },
        ],
    },
    2: {
        resultBatchId: 2,
        checkedDate: "2026-07-28",
        librarianCode: "LIB002",
        totalScore: 35,
        bookInfo: {
            bookId: 2,
            title: "데미안",
            author: "헤르만 헤세",
            publisher: "민음사",
            callNumber: "853.6-헤44ㄷ",
            coverUrl: "https://picsum.photos/seed/book2/200/280",
            status: "IDLE",
        },
        checkResults: [
            { checkItemId: 1, title: "표지 찢어짐", isPassed: true, itemScore: 0, note: "" },
            { checkItemId: 2, title: "책등 파손", isPassed: true, itemScore: 0, note: "" },
        ],
    },
    3: {
        resultBatchId: 3,
        checkedDate: "2026-07-20",
        librarianCode: "LIB001",
        totalScore: 92,
        bookInfo: {
            bookId: 3,
            title: "1984",
            author: "조지 오웰",
            publisher: "민음사",
            callNumber: "843-오96일",
            coverUrl: "https://picsum.photos/seed/book3/200/280",
            status: "DISCARDED",
        },
        checkResults: [
            { checkItemId: 1, title: "표지 찢어짐", isPassed: false, itemScore: 5, note: "표지 완전 분리" },
            { checkItemId: 2, title: "책등 파손", isPassed: false, itemScore: 5, note: "책등 갈라짐" },
        ],
    },
};

const MOCK_HISTORY: Record<number, ChecklistHistoryEntry[]> = {
    1: [
        {
            resultBatchId: 1,
            bookId: 1,
            librarianCode: "LIB001",
            checkedDate: "2026-08-01",
            totalScore: 80,
            items: [
                {
                    checkItemId: 1,
                    title: "표지 찢어짐",
                    category: "COVER",
                    description: "표지 손상 여부 점검",
                    isPassed: false,
                    note: "30페이지 낙서있음",
                },
            ],
        },
    ],
};

const MOCK_CHECK_ITEMS: CheckItemMaster[] = [
    { id: 1, title: "표지 찢어짐", category: "COVER", description: "표지 손상 여부 점검", maxScore: 5 },
    { id: 2, title: "책등 파손", category: "COVER", description: "책등 손상 여부 점검", maxScore: 5 },
    { id: 3, title: "페이지 낙서", category: "BOOK", description: "본문 낙서/훼손 여부 점검", maxScore: 5 },
];

// 점검 완료 도서 전체 목록 조회
export const getCompletedChecklistsApiMock = (): Promise<CompletedChecklistListResponse> =>
    mockDelay(MOCK_ITEMS);

// 도서 상세 조회 — 없는 bookId는 실제 500(비JSON) 응답을 재현
export const getBookDetailApiMock = async (bookId: number): Promise<BookDetailResult> => {
    await mockDelay(null);
    if (NON_EXISTENT_BOOK_IDS.has(bookId) || !MOCK_DETAILS[bookId]) {
        throw new ApiError(NOT_FOUND_MESSAGE, 500);
    }
    return MOCK_DETAILS[bookId];
};

// 도서 점검 전체 이력 리스트 조회
export const getBookHistoryApiMock = (bookId: number): Promise<ChecklistHistoryEntry[]> =>
    mockDelay(MOCK_HISTORY[bookId] ?? []);

// 점검 결과 수정 — 없는 resultBatchId는 500(비JSON) 응답을 재현
export const updateChecklistResultApiMock = async (
    resultBatchId: number,
    body: UpdateChecklistResultRequest
): Promise<UpdateChecklistResultData> => {
    await mockDelay(null);
    if (NON_EXISTENT_RESULT_BATCH_IDS.has(resultBatchId)) {
        throw new ApiError(NOT_FOUND_MESSAGE, 500);
    }
    const totalScore = body.checkResults.reduce((sum, r) => sum + r.itemScore, 0);
    return { resultBatchId, totalScore, updatedAt: new Date().toISOString() };
};

// 점검 항목(CheckItem) 등록
export const createCheckItemApiMock = (
    body: CreateCheckItemRequest
): Promise<{ checkItemId: number }> => {
    const nextId = MOCK_CHECK_ITEMS.length + 1;
    MOCK_CHECK_ITEMS.push({ id: nextId, ...body });
    return mockDelay({ checkItemId: nextId });
};

// 점검 항목(CheckItem) 전체 조회
export const getCheckItemsApiMock = (): Promise<CheckItemMaster[]> => mockDelay(MOCK_CHECK_ITEMS);

// 폐기/이관/보존 결정 확정 — 없는 resultBatchId는 500(비JSON) 응답을 재현
export const confirmDecisionApiMock = async (
    resultBatchId: number,
    body: ConfirmDecisionRequest
): Promise<ConfirmDecisionData> => {
    await mockDelay(null);
    if (NON_EXISTENT_RESULT_BATCH_IDS.has(resultBatchId)) {
        throw new ApiError(NOT_FOUND_MESSAGE, 500);
    }
    return { resultBatchId, decision: body.decision, decidedAt: new Date().toISOString() };
};

// 폐기/이관/보존 결정 확정 (일괄) — 없는 resultBatchId가 포함돼 있으면 500(비JSON) 응답을 재현
export const confirmDecisionsApiMock = async (
    body: ConfirmDecisionsRequest
): Promise<ConfirmDecisionsResponse> => {
    await mockDelay(null);
    if (body.items.some((item) => NON_EXISTENT_RESULT_BATCH_IDS.has(item.resultBatchId))) {
        throw new ApiError(NOT_FOUND_MESSAGE, 500);
    }
    const decidedAt = new Date().toISOString();
    return body.items.map((item) => ({ resultBatchId: item.resultBatchId, decision: item.decision, decidedAt }));
};

// 도서 월별 대출 추이 조회 (GET /api/checklists/books/{bookId}/loans/monthly)
// 최근 12개월(25.08 ~ 26.07)치를 bookId 기반 결정적 해시로 생성합니다. (오래된 달 → 최근 달 순)
const MONTHLY_TREND_MONTH_LABELS = [
    "25.08", "25.09", "25.10", "25.11", "25.12",
    "26.01", "26.02", "26.03", "26.04", "26.05", "26.06", "26.07",
];

export const getMonthlyLoanTrendApiMock = async (bookId: number): Promise<MonthlyLoanTrendItem[]> => {
    if (NON_EXISTENT_BOOK_IDS.has(bookId)) {
        throw new ApiError(NOT_FOUND_MESSAGE, 500);
    }
    const base = 2 + (hashCode(`loan-base-${bookId}`) % 8); // 2~9건 기준선
    const data = MONTHLY_TREND_MONTH_LABELS.map((month, i) => {
        const seed = hashCode(`loan-${bookId}-${i}`);
        const jitter = (seed % 5) - 2; // -2 ~ +2
        return { month, v: Math.max(0, base + jitter) };
    });
    return mockDelay(data);
};