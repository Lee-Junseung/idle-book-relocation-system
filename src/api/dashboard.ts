import { apiGet, USE_MOCK } from "./client";
import type {
    IdleBooksCountResponse,
    DamagePendingCountResponse,
    TransferPendingCountResponse,
    MonthlyLoansResponse,
    UsersDistributionResponse,
    LibraryNetworkResponse,
} from "../types/dashboard";
import type { LibraryId } from "../constants/library";
import {
    getIdleBooksCountMock,
    getDamagePendingCountMock,
    getTransferPendingCountMock,
    getMonthlyLoansMock,
    getUsersDistributionMock,
    getLibraryNetworkDistancesMock,
} from "./dashboardMock";

// libraryId가 필요한 두 API는 필수 파라미터로 받는다 (default 값 없음).
// 호출부(OverviewPage 등)가 "어떤 도서관인지"를 항상 명시적으로 넘기도록 강제해서, 추후 도서관이 여러 개가 되어도 이 파일은 수정할 필요가 없게 한다.
export const getIdleBooksCount = (
    libraryId: LibraryId
): Promise<IdleBooksCountResponse> =>
    USE_MOCK
        ? getIdleBooksCountMock(libraryId)
        : apiGet(`/api/dashboard/idle-books/count?libraryId=${encodeURIComponent(libraryId)}`);

export const getDamagePendingCount = (
    libraryId: LibraryId
): Promise<DamagePendingCountResponse> =>
    USE_MOCK
        ? getDamagePendingCountMock(libraryId)
        : apiGet(`/api/dashboard/damage-pending/count?libraryId=${encodeURIComponent(libraryId)}`);

// libraryId를 요구하지 않는 API들은 그대로 유지
export const getTransferPendingCount = (): Promise<TransferPendingCountResponse> =>
    USE_MOCK ? getTransferPendingCountMock() : apiGet("/api/dashboard/transfer-pending/count");

export const getMonthlyLoans = (): Promise<MonthlyLoansResponse> =>
    USE_MOCK ? getMonthlyLoansMock() : apiGet("/api/dashboard/loans/monthly");

export const getUsersDistribution = (): Promise<UsersDistributionResponse> =>
    USE_MOCK ? getUsersDistributionMock() : apiGet("/api/dashboard/users/distribution");

export const getLibraryNetworkDistances = (): Promise<LibraryNetworkResponse> =>
    USE_MOCK ? getLibraryNetworkDistancesMock() : apiGet("/api/dashboard/libraries/network-distances");