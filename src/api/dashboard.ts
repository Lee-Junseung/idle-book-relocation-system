import { apiGet, USE_MOCK } from "./client";
import type {
    IdleBooksCountResponse,
    DamagePendingCountResponse,
    TransferPendingCountResponse,
    MonthlyLoansResponse,
    UsersDistributionResponse,
    LibraryNetworkResponse,
} from "../types/dashboard";
import {
    getIdleBooksCountMock,
    getDamagePendingCountMock,
    getTransferPendingCountMock,
    getMonthlyLoansMock,
    getUsersDistributionMock,
    getLibraryNetworkDistancesMock,
} from "./dashboardMock";

export const getIdleBooksCount = (): Promise<IdleBooksCountResponse> =>
    USE_MOCK ? getIdleBooksCountMock() : apiGet("/api/dashboard/idle-books/count");

export const getDamagePendingCount = (): Promise<DamagePendingCountResponse> =>
    USE_MOCK ? getDamagePendingCountMock() : apiGet("/api/dashboard/damage-pending/count");

export const getTransferPendingCount = (): Promise<TransferPendingCountResponse> =>
    USE_MOCK ? getTransferPendingCountMock() : apiGet("/api/dashboard/transfer-pending/count");

export const getMonthlyLoans = (): Promise<MonthlyLoansResponse> =>
    USE_MOCK ? getMonthlyLoansMock() : apiGet("/api/dashboard/loans/monthly");

export const getUsersDistribution = (): Promise<UsersDistributionResponse> =>
    USE_MOCK ? getUsersDistributionMock() : apiGet("/api/dashboard/users/distribution");

export const getLibraryNetworkDistances = (): Promise<LibraryNetworkResponse> =>
    USE_MOCK ? getLibraryNetworkDistancesMock() : apiGet("/api/dashboard/libraries/network-distances");