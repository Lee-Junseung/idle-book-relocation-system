import { mockDelay } from "./client";
import { loanTrendData, demographicsData, BRANCHES } from "../data";
import { CURRENT_LIBRARY, type LibraryId } from "../constants/library";
import type {
    IdleBooksCountResponse,
    DamagePendingCountResponse,
    TransferPendingCountResponse,
    MonthlyLoansResponse,
    UsersDistributionResponse,
    LibraryNetworkResponse,
} from "../types/dashboard";

// libraryId별로 다른 값을 흉내내기 위한 목 데이터 테이블.
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
        data: loanTrendData.map((d, i) => {
            const num = parseInt(d.month, 10); // "7월" -> 7
            const year = num >= 7 ? 2025 : 2026; // 2025년 7월 ~ 2026년 6월 기준
            const date = `${year}-${String(num).padStart(2, "0")}`; // "2025-07"
            const prev = loanTrendData[i - 1];
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
    const totalPopulation = demographicsData.reduce((s, d) => s + d.count, 0);
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
    demographicsData.forEach((d) => {
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