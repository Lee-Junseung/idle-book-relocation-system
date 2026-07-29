import { mockDelay } from "./client";
import { loanTrendData, demographicsData, BRANCHES } from "../data";
import type {
    IdleBooksCountResponse,
    DamagePendingCountResponse,
    TransferPendingCountResponse,
    MonthlyLoansResponse,
    UsersDistributionResponse,
    LibraryNetworkResponse,
} from "../types/dashboard";

export const getIdleBooksCountMock = (): Promise<IdleBooksCountResponse> =>
    mockDelay({
        success: true,
        data: {
            currentMonthCount: 416,
            lastMonthCount: 200,
            percentageChange: -3,
        },
    });

export const getDamagePendingCountMock = (): Promise<DamagePendingCountResponse> =>
    mockDelay({
        success: true,
        data: { currentMonthCount: 89, lastMonthCount: 80, countChange: 9 },
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