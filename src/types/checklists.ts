// 마모 점검 대상 도서 목록 조회(GET) / 점검 리스트 등록(POST) / 유휴화 재산정(POST) API의 요청·응답 타입

export type ChecklistStatus = "DAMAGE_PENDING"; // 추후 다른 상태값이 생기면 union으로 확장

export interface ChecklistPageInfo {
    currentPage: number;
    totalPages: number;
    totalElements: number;
}

// GET /api/checklists 의 data 배열 원소 — 도서 1건의 유휴화 점수 산정 결과
export interface ChecklistListItem {
    resultId: number;
    isbn: string;
    bookTitle: string;
    author: string;
    genre: string;
    idleScore: number;
    sage: number;
    sloan: number;
    sdecay: number;
}

// GET /api/checklists?status=DAMAGE_PENDING&page=&size= 응답
export interface ChecklistListResponse {
    success: true;
    pageInfo: ChecklistPageInfo;
    data: ChecklistListItem[];
}

export interface CheckResultItem {
    checkItemId: number;
    isPassed: boolean;
    itemScore: number;
    note?: string;
}

// POST /api/checklists/results 요청 바디
export interface ChecklistRegisterRequest {
    bookId: number;
    librarianCode: string;
    checkedDate: string;
    totalScore: number;
    checkResults: CheckResultItem[];
}

// POST /api/checklists/results 응답
export interface ChecklistRegisterResponse {
    status: "SUCCESS" | "ERROR";
    message: string;
    data: {
        resultBatchId: number;
        totalScore: number;
        checkedAt: string;
    };
}

// POST /api/checklists/idle-classify 응답의 idleBooks 배열 원소
export interface IdleClassifyBookItem {
    bookTitle: string;
    author: string;
    uScore: number;
}

// POST /api/checklists/idle-classify 응답 (요청 바디 없음)
export interface IdleClassifyResponse {
    libraryName: string;
    totalAnalyzedBooks: number;
    newlyClassifiedIdleBooks: number;
    executionTimeMs: number;
    idleBooks: IdleClassifyBookItem[];
}

// 화면단에서 사용할 정규화된 에러 상태 (types/dashboard.ts의 DashboardErrorState와 동일한 형태로 맞춤)
export interface ChecklistErrorState {
    message: string;
    errorType?: string;
    statusCode?: number;
}
