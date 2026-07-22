// 월별/연도별 대출 통계와 연령대별 이용자 분포 데이터
export interface MonthlyLoanTrend {
  month: string; loans: number; returns: number; renewals: number; members: number; collection: number; turnover: number;
}
export interface AnnualLoanTrend {
  year: string; collection: number; loans: number; turnover: number; newMembers: number;
}
export interface AgeDemographic {
  age: string; count: number; pct: number;
}

export const loanTrendData: MonthlyLoanTrend[] = [
  { month: "1월",  loans:  8420, returns:  7810, renewals: 2340, members: 1820, collection: 139400, turnover: 0.060 },
  { month: "2월",  loans:  7860, returns:  7420, renewals: 2110, members: 1640, collection: 139760, turnover: 0.056 },
  { month: "3월",  loans:  9340, returns:  8890, renewals: 2580, members: 2140, collection: 140120, turnover: 0.067 },
  { month: "4월",  loans:  9820, returns:  9210, renewals: 2760, members: 2380, collection: 140480, turnover: 0.070 },
  { month: "5월",  loans: 10440, returns:  9870, renewals: 3020, members: 2620, collection: 140840, turnover: 0.074 },
  { month: "6월",  loans:  8970, returns:  8540, renewals: 2410, members: 2190, collection: 141200, turnover: 0.064 },
  { month: "7월",  loans: 11250, returns: 10680, renewals: 3340, members: 3010, collection: 141560, turnover: 0.079 },
  { month: "8월",  loans: 12380, returns: 11840, renewals: 3780, members: 3540, collection: 141920, turnover: 0.087 },
  { month: "9월",  loans:  9640, returns:  9180, renewals: 2640, members: 2280, collection: 142280, turnover: 0.068 },
  { month: "10월", loans: 10180, returns:  9720, renewals: 2880, members: 2490, collection: 142520, turnover: 0.071 },
  { month: "11월", loans:  9560, returns:  9140, renewals: 2610, members: 2210, collection: 142680, turnover: 0.067 },
  { month: "12월", loans:  8840, returns:  8420, renewals: 2320, members: 1980, collection: 142840, turnover: 0.062 },
];

export const annualData: AnnualLoanTrend[] = [
  { year:"2017", collection: 95200, loans: 78400, turnover: 0.82, newMembers: 1240 },
  { year:"2018", collection:101800, loans: 84100, turnover: 0.83, newMembers: 1380 },
  { year:"2019", collection:108400, loans: 89600, turnover: 0.83, newMembers: 1510 },
  { year:"2020", collection:114600, loans: 94200, turnover: 0.82, newMembers: 1620 },
  { year:"2021", collection:120900, loans: 99100, turnover: 0.82, newMembers: 1740 },
  { year:"2022", collection:126100, loans: 61800, turnover: 0.49, newMembers:  840 },
  { year:"2023", collection:130500, loans: 72400, turnover: 0.55, newMembers: 1120 },
  { year:"2024", collection:135200, loans: 87600, turnover: 0.65, newMembers: 1480 },
  { year:"2025", collection:139400, loans:104300, turnover: 0.75, newMembers: 1860 },
  { year:"2026", collection:142840, loans:118670, turnover: 0.83, newMembers: 2180 },
];

export const demographicsData: AgeDemographic[] = [
  { age: "10대 이하", count: 3840, pct: 18 },
  { age: "10대",      count: 4270, pct: 20 },
  { age: "20대",      count: 2960, pct: 14 },
  { age: "30대",      count: 3510, pct: 16 },
  { age: "40대",      count: 3840, pct: 18 },
  { age: "50대",      count: 2140, pct: 10 },
  { age: "60대 이상", count:  870, pct:  4 },
];
