export interface IdleBooksCountResponse {
    success: boolean;
    currentMonthCount: number;
    lastMonthCount: number;
    percentageChange: number;
}

export interface DamagePendingCountResponse {
    success: boolean;
    count: number;
}

export interface TransferPendingCountResponse {
    success: boolean;
    count: number;
}

export interface MonthlyLoanPoint {
    date: string; // "2026-04"
    totalBooks: number;
    totalLoans: number;
    turnoverRate: number;
    booksDelta: number;
}

export interface MonthlyLoansResponse {
    success: boolean;
    data: MonthlyLoanPoint[];
}

export interface AgeBucket {
    percentage: number;
    count: number;
}

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

export interface LibraryNetworkItem {
    libraryName: string;
    address: string;
    bookCount: number;
    length: number; // km
}

export interface LibraryNetworkResponse {
    data: LibraryNetworkItem[];
}