// 유휴화 도서 수 조회
export interface IdleBooksCountResponse {
    success: boolean;
    data: {
        currentMonthCount: number;
        lastMonthCount: number;
        percentageChange: number;
    };
}

// 파손 심사 대기 수 조회
export interface DamagePendingCountResponse {
    success: boolean;
    data: {
        currentMonthCount: number;
        lastMonthCount: number;
        countChange: number;
    };
}

// 이관 검토 대기 수 조회
export interface TransferPendingCountResponse {
    success: boolean;
    data: {
        count: number;
    };
}

// 도서관 월별 대출 현황 조회 (data)
export interface MonthlyLoanPoint {
    date: string; // "2026-04"
    totalBooks: number;
    totalLoans: number;
    turnoverRate: number;
    booksDelta: number;
}

// 도서관 월별 대출 현황 조회
export interface MonthlyLoansResponse {
    success: boolean;
    data: MonthlyLoanPoint[];
}

// 지역 인원 분포 목록 조회 (ageDistribution)
export interface AgeBucket {
    percentage: number;
    count: number;
}

// 지역 인원 분포 목록 조회
export interface UsersDistributionResponse {
    success: boolean;
    data: {
        districtName: string;
        totalPopulation: number;
        ageDistribution: {
            ageUnder10: AgeBucket;
            age10s: AgeBucket;
            age20s: AgeBucket;
            age30s: AgeBucket;
            age40s: AgeBucket;
            age50s: AgeBucket;
            age60Plus: AgeBucket;
        };
    };
}

// 수원시 도서관 네트워크 거리 조회 (data)
export interface LibraryNetworkItem {
    libraryName: string;
    address: string;
    bookCount: number;
    length: number; // km
}

// 수원시 도서관 네트워크 거리 조회
export interface LibraryNetworkResponse {
    success: boolean;
    data: LibraryNetworkItem[];
}

// 공통 에러 응답
// 400/404/500 등 에러 시 공통 형태 (client.ts의 ApiError로 매핑됨)
export interface ApiErrorBody {
    success: false;
    status: number;
    message: string;
    error: string;
}

// 화면단에서 사용할 정규화된 에러 상태.
// message(사용자용 문구)와 error(에러 타입 뱃지용)를 분리해서 보관한다.
export interface DashboardErrorState {
    message: string;
    errorType?: string;
    // "Bad Request", "Not Found", "Internal Server Error" 등
    statusCode?: number;
    // 400, 404, 500 등
}