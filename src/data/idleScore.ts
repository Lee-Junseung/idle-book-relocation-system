// 유휴화 점수 계산 유틸
// ⚠️ 산정 기준이 아직 확정되지 않아 임의로 정의한 임시 계산식입니다.
// 추후 백엔드 API(예: GET /api/checklists 의 idleGrade)로 값을 받아오게 되면
// 이 함수는 제거하고 응답값을 그대로 사용하면 됩니다.
import { Book } from "../types";
import { monthsSince } from "./wearUtils";

// 대출 공백 기간(경과 개월) 관련 상수
const MONTHS_CAP = 24; // 24개월 이상 경과 시 이 항목은 만점 처리
const MONTHS_WEIGHT = 60; // 100점 중 경과 개월이 차지하는 최대 비중

// 연간 대출율(turnover) 관련 상수
const TURNOVER_CAP = 5; // 연 대출율 5회 이상이면 유휴 기여도 0으로 처리
const TURNOVER_WEIGHT = 40; // 100점 중 대출율이 차지하는 최대 비중

export interface IdleScoreBreakdown {
    score: number; // 0~100 최종 유휴화 점수 (반올림)
    monthsElapsed: number;
    monthsContribution: number; // 소수점 1자리, 최대 MONTHS_WEIGHT
    turnover: number;
    turnoverContribution: number; // 소수점 1자리, 최대 TURNOVER_WEIGHT
}

export function computeIdleScore(book: Book): IdleScoreBreakdown {
    const monthsElapsed = monthsSince(book.lastLoan);
    const monthsRaw = Math.min(monthsElapsed, MONTHS_CAP);
    const monthsContribution = +((monthsRaw / MONTHS_CAP) * MONTHS_WEIGHT).toFixed(1);

    const turnoverGap = Math.max(0, TURNOVER_CAP - book.turnover);
    const turnoverContribution = +((Math.min(turnoverGap, TURNOVER_CAP) / TURNOVER_CAP) * TURNOVER_WEIGHT).toFixed(1);

    const score = Math.min(100, Math.round(monthsContribution + turnoverContribution));

    return { score, monthsElapsed, monthsContribution, turnover: book.turnover, turnoverContribution };
}