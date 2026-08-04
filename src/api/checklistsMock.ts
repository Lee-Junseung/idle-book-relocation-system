// VITE_USE_MOCK=true 일 때 사용하는 목업 구현체.
// hashCode 기반이라 새로고침해도 값이 흔들리지 않음.
import { hashCode, mockDelay } from "./client";
import {
    ChecklistListItem,
    ChecklistListQuery,
    ChecklistListResponse,
    ChecklistRegisterRequest,
    ChecklistRegisterResponse,
    ChecklistStatus,
    IdleClassifyResponse,
} from "../types/checklists";

const MOCK_TOTAL_ELEMENTS = 45;

const MOCK_POOL: { bookTitle: string; author: string; genre: string }[] = [
    { bookTitle: "이기적 유전자", author: "리처드 도킨스", genre: "자연과학" },
    { bookTitle: "스프링 부트 핵심 가이드", author: "장정우", genre: "총류" },
    { bookTitle: "코스모스", author: "칼 세이건", genre: "자연과학" },
    { bookTitle: "사피엔스", author: "유발 하라리", genre: "역사" },
    { bookTitle: "1984", author: "조지 오웰", genre: "소설" },
    { bookTitle: "채식주의자", author: "한강", genre: "소설" },
    { bookTitle: "총, 균, 쇠", author: "재레드 다이아몬드", genre: "역사" },
    { bookTitle: "클린 코드", author: "로버트 마틴", genre: "총류" },
    { bookTitle: "정의란 무엇인가", author: "마이클 샌델", genre: "철학" },
    { bookTitle: "미움받을 용기", author: "기시미 이치로", genre: "철학" },
];

function buildMockItem(index: number): ChecklistListItem {
    const base = MOCK_POOL[index % MOCK_POOL.length];
    const h = hashCode(`checklist-${index}`);
    return {
        resultId: index + 1,
        isbn: String(1000 + index),
        bookTitle: base.bookTitle,
        author: base.author,
        genre: base.genre,
        idleScore: Math.round((40 + (h % 60)) * 10) / 10,
        sAge: Math.round((10 + (h % 80)) * 10) / 10,
        sLoan: Math.round((10 + ((h >> 3) % 80)) * 10) / 10,
        sDecay: Math.round((10 + ((h >> 5) % 80)) * 10) / 10,
    };
}

export const getChecklistListApiMock = (
    _status: ChecklistStatus,
    page: number,
    size: number,
    query: ChecklistListQuery = {}
): Promise<ChecklistListResponse> => {
    // 실제 백엔드는 keyword/genre/sortOrder를 전체 데이터 기준으로 적용한 뒤 페이지를 잘라 내려주므로,
    // mock도 동일하게 "전체 목록 생성 → 필터/정렬 → 페이지 슬라이스" 순서로 흉내낸다.
    let all = Array.from({ length: MOCK_TOTAL_ELEMENTS }, (_, i) => buildMockItem(i));

    if (query.keyword) {
        const kw = query.keyword.trim();
        all = all.filter((b) => b.bookTitle.includes(kw) || b.isbn.includes(kw));
    }
    if (query.genre) {
        all = all.filter((b) => b.genre === query.genre);
    }
    if (query.sortOrder) {
        all = [...all].sort((a, b) =>
            query.sortOrder === "ASC" ? a.idleScore - b.idleScore : b.idleScore - a.idleScore
        );
    }

    const totalElements = all.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const start = page * size;
    const end = Math.min(start + size, totalElements);
    const data = all.slice(start, end);

    return mockDelay({
        success: true,
        pageInfo: { currentPage: page, totalPages, totalElements },
        data,
    });
};

export const registerChecklistApiMock = (
    body: ChecklistRegisterRequest
): Promise<ChecklistRegisterResponse> =>
    mockDelay({
        status: "SUCCESS",
        message: "도서 점검 결과가 성공적으로 저장되었습니다.",
        data: {
            resultBatchId: hashCode(`${body.resultId}-${body.checkedDate}`),
            totalScore: body.totalScore,
            checkedAt: new Date().toISOString(),
        },
    });

// 유휴화 도서 재산정 목업 (POST /api/checklists/idle-classify)
// 매 호출마다 시각을 섞은 해시로 값이 조금씩 바뀌도록 해서 "재산정이 실제로 돌았다"는 느낌만 재현.
export const classifyIdleBooksApiMock = (): Promise<IdleClassifyResponse> => {
    const h = hashCode(`idle-classify-${Date.now()}`);
    const newlyClassifiedIdleBooks = h % 8;
    const sampleCount = Math.min(newlyClassifiedIdleBooks, 3);

    return mockDelay({
        libraryName: "경기도교육청중앙도서관",
        totalAnalyzedBooks: 320 + (h % 50),
        newlyClassifiedIdleBooks,
        executionTimeMs: 1200 + (h % 800),
        idleBooks: MOCK_POOL.slice(0, sampleCount).map((b, i) => ({
            bookTitle: b.bookTitle,
            author: b.author,
            uScore: Math.round((10 + ((h >> (i + 2)) % 20)) * 10) / 10,
        })),
    });
};
