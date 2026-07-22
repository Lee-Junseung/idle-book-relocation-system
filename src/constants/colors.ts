// 도서관 대시보드 전역에서 쓰는 색상 상수 정의 파일
export const NAV = "#16324A";
export const BLUE = "#3C6E91";
export const GREEN = "#2F6F4E";
export const RED = "#B33A3A";
export const PURPLE = "#6B4C7A";
export const AMBER = "#B8863B";
export const TEAL = "#3F7A6E";
export const BROWN = "#8A8371";

// as const로 readonly 처리하여 실수로 push/splice 등으로 변형하지 못하게 함
export const PIE_COLORS = [NAV, BLUE, GREEN, AMBER, PURPLE, RED, BROWN] as const;

// index 0은 "미평가/값 없음"을 나타내는 의도적 빈 값(sentinel)이며, 실제 등급은 1~5.
// 이 배열을 직접 인덱싱하지 말고 components/lib.ts의 getDotColor()/getDotLabel()을 통해 접근할 것.
// (해당 함수들이 0 또는 범위를 벗어난 인덱스를 중립색/빈 라벨로 안전하게 처리함)
export const DOT_COLORS = ["", "#2F6F4E", "#7C8F4E", "#B8863B", "#C1673C", "#B33A3A"] as const;
export const DOT_LABELS = ["", "양호", "경미", "보통", "심각", "불량"] as const;
