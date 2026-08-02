import { mockDelay } from "./client";
import { CURRENT_LIBRARY, type LibraryId } from "../constants/library";
import type {
    IdleBooksCountResponse,
    DamagePendingCountResponse,
    TransferPendingCountResponse,
    MonthlyLoansResponse,
    UsersDistributionResponse,
    LibraryNetworkResponse,
} from "../types/dashboard";

interface MonthlyLoanTrendRaw {
    month: string; // "1월" ~ "12월"
    loans: number;
    returns: number;
    renewals: number;
    members: number;
    collection: number;
    turnover: number;
}

// 2026년 1월~12월 실적 (단일 연도, 회계연도 아님 — 12월 collection이 annualData의 2026년 값과 일치)
const LOAN_TREND_DATA: MonthlyLoanTrendRaw[] = [
    { month: "1월", loans: 8420, returns: 7810, renewals: 2340, members: 1820, collection: 139400, turnover: 0.060 },
    { month: "2월", loans: 7860, returns: 7420, renewals: 2110, members: 1640, collection: 139760, turnover: 0.056 },
    { month: "3월", loans: 9340, returns: 8890, renewals: 2580, members: 2140, collection: 140120, turnover: 0.067 },
    { month: "4월", loans: 9820, returns: 9210, renewals: 2760, members: 2380, collection: 140480, turnover: 0.070 },
    { month: "5월", loans: 10440, returns: 9870, renewals: 3020, members: 2620, collection: 140840, turnover: 0.074 },
    { month: "6월", loans: 8970, returns: 8540, renewals: 2410, members: 2190, collection: 141200, turnover: 0.064 },
    { month: "7월", loans: 11250, returns: 10680, renewals: 3340, members: 3010, collection: 141560, turnover: 0.079 },
    { month: "8월", loans: 12380, returns: 11840, renewals: 3780, members: 3540, collection: 141920, turnover: 0.087 },
    { month: "9월", loans: 9640, returns: 9180, renewals: 2640, members: 2280, collection: 142280, turnover: 0.068 },
    { month: "10월", loans: 10180, returns: 9720, renewals: 2880, members: 2490, collection: 142520, turnover: 0.071 },
    { month: "11월", loans: 9560, returns: 9140, renewals: 2610, members: 2210, collection: 142680, turnover: 0.067 },
    { month: "12월", loans: 8840, returns: 8420, renewals: 2320, members: 1980, collection: 142840, turnover: 0.062 },
];

// 실제 이 데이터가 속한 연도. LOAN_TREND_DATA는 이 연도 1~12월 데이터로 취급한다.
const LOAN_TREND_YEAR = 2026;

interface AgeDemographicRaw {
    age: string;
    count: number;
    pct: number;
}

const DEMOGRAPHICS_DATA: AgeDemographicRaw[] = [
    { age: "10대 이하", count: 3840, pct: 18 },
    { age: "10대", count: 4270, pct: 20 },
    { age: "20대", count: 2960, pct: 14 },
    { age: "30대", count: 3510, pct: 16 },
    { age: "40대", count: 3840, pct: 18 },
    { age: "50대", count: 2140, pct: 10 },
    { age: "60대 이상", count: 870, pct: 4 },
];

interface BranchRaw {
    id: string;
    name: string;
    district: string;
    hub: boolean;
    distance: number;
    collection: number;
}

const BRANCHES: BranchRaw[] = [
    { id: "buksuwon", name: "북수원도서관", district: "장안구", hub: true, distance: 0, collection: 142840 },
    { id: "central", name: "수원시립중앙도서관", district: "팔달구", hub: false, distance: 4.1, collection: 218560 },
    { id: "yeongtong", name: "영통도서관", district: "영통구", hub: false, distance: 8.7, collection: 94320 },
    { id: "gwonseon", name: "권선도서관", district: "권선구", hub: false, distance: 6.2, collection: 81740 },
    { id: "mangpo", name: "망포도서관", district: "영통구", hub: false, distance: 9.3, collection: 67280 },
    { id: "gwanggyo", name: "광교도서관", district: "영통구", hub: false, distance: 5.8, collection: 103450 },
];

// libraryId별 mock 테이블
// 지금은 북수원도서관(CURRENT_LIBRARY.id) 하나만 등록되어 있지만, 확장 시 다른 도서관 id를 키로 추가하면 그대로 동작한다.
const MOCK_DATA_BY_LIBRARY: Record<
    LibraryId,
    {
        idleBooks: IdleBooksCountResponse["data"];
        damagePending: DamagePendingCountResponse["data"];
    }
> = {
    [CURRENT_LIBRARY.id]: {
        idleBooks: {
            currentMonthCount: 416,
            lastMonthCount: 200,
            percentageChange: -3,
        },
        damagePending: {
            currentMonthCount: 89,
            lastMonthCount: 80,
            countChange: 9,
        },
    },
};

// 등록되지 않은 libraryId가 들어와도 목 모드가 죽지 않도록 기본값으로 fallback.
const DEFAULT_ID = CURRENT_LIBRARY.id;

function resolveLibraryMock(libraryId?: LibraryId) {
    return MOCK_DATA_BY_LIBRARY[libraryId ?? DEFAULT_ID] ?? MOCK_DATA_BY_LIBRARY[DEFAULT_ID];
}

// mock API 함수들

export const getIdleBooksCountMock = (
    libraryId?: LibraryId
): Promise<IdleBooksCountResponse> =>
    mockDelay({
        success: true,
        data: resolveLibraryMock(libraryId).idleBooks,
    });

export const getDamagePendingCountMock = (
    libraryId?: LibraryId
): Promise<DamagePendingCountResponse> =>
    mockDelay({
        success: true,
        data: resolveLibraryMock(libraryId).damagePending,
    });

export const getTransferPendingCountMock = (): Promise<TransferPendingCountResponse> =>
    mockDelay({ success: true, data: { count: 47 } });

export const getMonthlyLoansMock = (): Promise<MonthlyLoansResponse> =>
    mockDelay({
        success: true,
        data: LOAN_TREND_DATA.map((d, i) => {
            const num = parseInt(d.month, 10); // "7월" -> 7
            const date = `${LOAN_TREND_YEAR}-${String(num).padStart(2, "0")}`; // "2026-07"
            const prev = LOAN_TREND_DATA[i - 1];
            return {
                date,
                totalBooks: d.collection,
                totalLoans: d.loans,
                turnoverRate: d.turnover,
                booksDelta: prev ? d.collection - prev.collection : 0,
            };
        }),
    });

export const getUsersDistributionMock = (): Promise<UsersDistributionResponse> => {
    const totalPopulation = DEMOGRAPHICS_DATA.reduce((s, d) => s + d.count, 0);
    const keyMap: Record<string, string> = {
        "10대 이하": "ageUnder10",
        "10대": "age10s",
        "20대": "age20s",
        "30대": "age30s",
        "40대": "age40s",
        "50대": "age50s",
        "60대 이상": "age60Plus",
    };
    const ageDistribution: Record<string, { percentage: number; count: number }> = {};
    DEMOGRAPHICS_DATA.forEach((d) => {
        const key = keyMap[d.age] ?? d.age;
        ageDistribution[key] = { percentage: d.pct, count: d.count };
    });

    return mockDelay({
        success: true,
        data: {
            districtName: "장안구",
            totalPopulation,
            ageDistribution: ageDistribution as UsersDistributionResponse["data"]["ageDistribution"],
        },
    });
};

export const getLibraryNetworkDistancesMock = (): Promise<LibraryNetworkResponse> =>
    mockDelay({
        success: true,
        data: BRANCHES.map((b) => ({
            libraryName: b.name,
            address: b.district,
            bookCount: b.collection,
            length: b.distance,
        })),
    });