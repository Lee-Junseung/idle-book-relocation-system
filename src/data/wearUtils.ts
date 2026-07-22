// 마모 점검/이관 판단에 쓰는 기준일 계산 및 월별 대출량 추정 데이터 생성 유틸
import { Book, LoanHistoryPoint } from "../types";
import { hashCode } from "./seed";

// 전역 "데이터 기준일" — 이 값이 이 프로젝트에서 기준일을 정의하는 단일 출처(source of truth)이며,
// App.tsx 헤더에 표시되는 날짜도 이 값에서 파생시켜야 한다 (과거에는 App.tsx가 같은 날짜를 별도로 하드코딩해 중복이 있었음).
export const DATA_REF_DATE = new Date("2026-07-01");

// dateStr부터 ref까지 경과한 개월 수. 주의: 일(day) 단위는 반영하지 않는 월 단위 근사치이므로,
// 월 경계 부근(예: 6개월 임계값)에서 최대 ±1개월 오차가 있을 수 있다.
export function monthsSince(dateStr: string, ref: Date = DATA_REF_DATE): number {
  const d = new Date(dateStr);
  return (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
}

const RECENT_12_MONTHS = ["25.08", "25.09", "25.10", "25.11", "25.12", "26.01", "26.02", "26.03", "26.04", "26.05", "26.06", "26.07"];

export function buildMonthlyLoanData(book: Book, annualHistory: LoanHistoryPoint[]): { month: string; v: number }[] {
  const last = annualHistory[annualHistory.length - 1]?.v ?? 0;
  const base = last / 12;
  return RECENT_12_MONTHS.map((m, i) => {
    const seed = hashCode(book.id + "-" + i);
    // 버그 수정: 기존 (seed % 50 - 20) / 100은 -0.20~+0.29로 비대칭이라 생성값이 살짝 위로 치우쳤음
    // -> (seed % 41 - 20) / 100으로 -0.20~+0.20 대칭 범위로 수정
    const jitter = ((seed % 41) - 20) / 100;
    const value = Math.max(0, Math.round(base * (1 + jitter)));
    return { month: m, v: value };
  });
}
