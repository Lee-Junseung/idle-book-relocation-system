// hex 컬러 + 투명도 문자열 연결(`color + "18"` 등)과 DOT_COLORS/DOT_LABELS 인덱싱 시 범위 체크 누락을 공통으로 해결하기 위한 유틸
import { DOT_COLORS, DOT_LABELS } from "../constants/colors";

// DOT_COLORS[0] === "" (미평가/값 없음 상태)이거나 배열 범위를 벗어난 인덱스일 때 쓰는 중립색
const NEUTRAL_COLOR = "#9CA3AF";

// hex 컬러에 0~1 사이 투명도를 적용해 rgba() 문자열로 변환한다. NAV+"18" 같은 문자열 연결 방식이
// NAV가 정확히 6자리 hex라는 가정에 의존하던 문제를 없앤다.
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 값을 [min, max] 정수 범위로 제한한다. 도트 채움 개수처럼 "실제 유효 범위"가 필요한 곳에서 사용.
// 주의: 이 함수는 값의 의미(0=미평가 등)를 바꾸지 않는다 — 단순히 배열 인덱스 등에 안전하게 넣기 위한 범위 제한용.
export function clampIndex(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

// 평균 점수처럼 항상 1~5 범위가 보장되는 값을 표시용으로 반올림한다 (예: 15문항 평균 점수).
// 0을 "미평가"로 다루는 개별 항목 점수(level)에는 사용하지 말 것 — getDotColor/getDotLabel을 쓸 것.
export function clampScore(value: number): number {
  return clampIndex(value, 1, 5);
}

// 손상도/점수에 해당하는 색상을 안전하게 조회한다.
// level이 0("" = 미평가)이거나 배열 범위를 벗어나면 중립 회색으로 폴백하고, 1~5는 원래 의미 그대로 반환한다.
export function getDotColor(level: number): string {
  return DOT_COLORS[Math.round(level)] || NEUTRAL_COLOR;
}

// 손상도/점수에 해당하는 라벨을 안전하게 조회한다. 범위를 벗어나면 빈 문자열로 폴백한다.
export function getDotLabel(level: number): string {
  return DOT_LABELS[Math.round(level)] ?? "";
}
