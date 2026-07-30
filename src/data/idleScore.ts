// 유휴화 점수(U-Score) 산출 로직
// 참고 문서: 유휴화점수_상호대차매칭_알고리즘.pdf §1
//
// Sage(i)  = min(100, (Ai / Nmax) * 100)                  ... 정보 노후도 (Ai = 기준연도 - 등록연도, Nmax = 10년)
// Vloan(i) = Ltotal(i) / max(1, Ai)                        ... 연평균 대출 속도
// Sloan(i) = 100 * (1 - min(1, Vloan(i) / Ltarget))         ... 대출 저조도 (Ltarget = 2.0건/년)
// Sdecay(i)= 100 * (1 - L12m(i) / (Ltotal(i) + 1))          ... 최근 1년 기여도 감쇄 (U-Score에는 미반영, 보조 필터로만 사용: Sdecay >= 90)
// Ui       = Wage(KDC) * Sage(i) + Wloan(KDC) * Sloan(i)

import { Book } from "../types";

const CURRENT_YEAR = 2026;
const N_MAX = 10; // 임계 기준 경과 연수
const L_TARGET = 2.0; // 목표 연평균 대출 횟수 (건/년)
const DECAY_FILTER_THRESHOLD = 90; // Sdecay 보조 필터 기준

// KDC별 가중치 테이블
// ⚠️ 실제 정책상 확정된 Wage(KDC), Wloan(KDC) 값이 아직 없어 임시로 균등 가중치(0.5/0.5)를 사용합니다.
// 실제 값이 확정되면 이 테이블만 교체하면 됩니다.
const KDC_WEIGHTS: Record<string, { wAge: number; wLoan: number }> = {
    "000": { wAge: 0.5, wLoan: 0.5 }, // 총류
    "100": { wAge: 0.5, wLoan: 0.5 }, // 철학
    "200": { wAge: 0.5, wLoan: 0.5 }, // 종교
    "300": { wAge: 0.5, wLoan: 0.5 }, // 사회과학
    "400": { wAge: 0.5, wLoan: 0.5 }, // 자연과학
    "500": { wAge: 0.5, wLoan: 0.5 }, // 기술과학
    "600": { wAge: 0.5, wLoan: 0.5 }, // 예술
    "700": { wAge: 0.5, wLoan: 0.5 }, // 언어
    "800": { wAge: 0.5, wLoan: 0.5 }, // 문학
    "900": { wAge: 0.5, wLoan: 0.5 }, // 역사
};
const DEFAULT_WEIGHTS = { wAge: 0.5, wLoan: 0.5 };

export interface IdleScoreResult {
    score: number; // Ui (반올림)
    ageYears: number; // Ai
    ageScore: number; // Sage(i)
    ageContribution: number; // Wage(KDC) * Sage(i)
    loanRate: number; // Vloan(i)
    loanScore: number; // Sloan(i)
    loanContribution: number; // Wloan(KDC) * Sloan(i)
    decayScore: number; // Sdecay(i)
    isDecayFiltered: boolean; // Sdecay(i) >= 90 (보조 필터)
}

export function computeIdleScore(book: Book): IdleScoreResult {
    const registeredYear = book.registeredYear ?? CURRENT_YEAR;
    const totalLoanCount = book.totalLoanCount ?? 0;
    const recentLoanCount12m = book.recentLoanCount12m ?? 0;
    const kdcCode = book.kdcCode ?? "";

    // ① 정보 노후도 Sage
    const ageYears = Math.max(0, CURRENT_YEAR - registeredYear);
    const sAge = Math.min(100, (ageYears / N_MAX) * 100);

    // ② 대출 저조도 Sloan
    const vLoan = totalLoanCount / Math.max(1, ageYears);
    const sLoan = 100 * (1 - Math.min(1, vLoan / L_TARGET));

    // ③ 최근 1년 기여도 감쇄 Sdecay (보조 필터 전용, 최종 점수에는 미반영)
    const sDecay = 100 * (1 - recentLoanCount12m / (totalLoanCount + 1));

    // ④ 최종 점수 Ui
    const { wAge, wLoan } = KDC_WEIGHTS[kdcCode] ?? DEFAULT_WEIGHTS;
    const ageContribution = wAge * sAge;
    const loanContribution = wLoan * sLoan;
    const score = Math.round(ageContribution + loanContribution);

    return {
        score,
        ageYears,
        ageScore: Math.round(sAge),
        ageContribution: Math.round(ageContribution),
        loanRate: vLoan,
        loanScore: Math.round(sLoan),
        loanContribution: Math.round(loanContribution),
        decayScore: Math.round(sDecay),
        isDecayFiltered: sDecay >= DECAY_FILTER_THRESHOLD,
    };
}