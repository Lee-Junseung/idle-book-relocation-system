// hex 컬러 + 투명도 문자열 연결(`color + "18"` 등)과 DOT_COLORS/DOT_LABELS 인덱싱 시 범위 체크 누락을 공통으로 해결하기 위한 유틸
import { DOT_COLORS, DOT_LABELS } from "../constants/colors";
import { clampToScore } from "../constants/checklistItems";
import { hashCode } from "../api/client";
import { Book, LoanHistoryPoint } from "../types";

// DOT_COLORS[0] === "" (미평가/값 없음 상태)이거나 배열 범위를 벗어난 인덱스일 때 쓰는 중립색
const NEUTRAL_COLOR = "#9CA3AF";

// hex 컬러에 0~1 사이 투명도를 적용해 rgba() 문자열로 변환함.
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 값을 [min, max] 정수 범위로 제한함. 도트 채움 개수처럼 "실제 유효 범위"가 필요한 곳에서 사용.
// 이 함수는 값의 의미(0=미평가 등)를 바꾸지 않음 — 단순히 배열 인덱스 등에 안전하게 넣기 위한 범위 제한용.
export function clampIndex(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// constants/checklistItems.ts의 clampToScore와 동일 로직 — 중복 제거를 위해 그쪽을 단일 소스로 재사용.
export function clampScore(value: number): number {
  return clampToScore(value);
}

// 손상도/점수에 해당하는 색상을 안전하게 조회함.
// level이 0("" = 미평가)이거나 배열 범위를 벗어나면 중립 회색으로 폴백하고, 1~5는 원래 의미 그대로 반환함.
export function getDotColor(level: number): string {
  return DOT_COLORS[Math.round(level)] || NEUTRAL_COLOR;
}

// 손상도/점수에 해당하는 라벨을 안전하게 조회함.
// 범위를 벗어나면 빈 문자열로 폴백함.
export function getDotLabel(level: number): string {
  return DOT_LABELS[Math.round(level)] ?? "";
}

// 마모 점검/이관 판단에 쓰는 기준일 계산 및 월별 대출량 추정 데이터 생성 유틸
// 전역 "데이터 기준일" — 이 값이 이 프로젝트에서 기준일을 정의하는 단일 출처(source of truth)이며, App.tsx 헤더에 표시되는 날짜도 이 값에서 파생시켜야 한다.
export const DATA_REF_DATE = new Date("2026-07-01");

// dateStr부터 ref까지 경과한 개월 수.
// 일(day) 단위는 반영하지 않는 월 단위 근사치이므로, 월 경계 부근(예: 6개월 임계값)에서 최대 ±1개월 오차가 있을 수 있다.
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
    const jitter = ((seed % 41) - 20) / 100;
    const value = Math.max(0, Math.round(base * (1 + jitter)));
    return { month: m, v: value };
  });
}
