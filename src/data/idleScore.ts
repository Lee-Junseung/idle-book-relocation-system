import { Book } from "../types";

const N_MAX = 10;           // Sage 임계 기준 경과 연수 (년)
const L_TARGET = 2.0;       // Sloan 목표 연평균 대출 횟수 (건/년)
const DECAY_THRESHOLD = 90; // Sdecay 보조 필터 임계값 (문서 §4)

// ⚠ KDC(장르)별 가중치 Wage(KDC)/Wloan(KDC)가 아직 확정되지 않아
// 툴팁의 "구성 요소 breakdown" 표시에는 임시 균등 가중치를 사용합니다.
// (전체 점수 자체는 서버가 계산한 idleScore를 그대로 사용하므로 실제 가중치와 무관하게 정확함)
const W_AGE = 0.5;
const W_LOAN = 0.5;

interface IdleScoreResult {
    score: number;
    ageYears: number;
    ageApprox: boolean;
    ageContribution: number;
    loanRate: number;
    loanApprox: boolean;
    loanContribution: number;
    isDecayFiltered: boolean;
}

export function computeIdleScore(book: Book): IdleScoreResult {
    const sage = book.sage ?? 0;
    const sloan = book.sloan ?? 0;
    const sdecay = book.sdecay ?? 0;

    // Sage(i) = min(100, (Ai / Nmax) × 100)  →  Ai = (Sage / 100) × Nmax
    const ageYears = Math.round((sage / 100) * N_MAX * 10) / 10;
    const ageApprox = sage >= 100;

    // Sloan(i) = 100 × (1 - min(1, Vloan / Ltarget))  →  Vloan = Ltarget × (1 - Sloan / 100)
    const loanRate = Math.round(L_TARGET * (1 - sloan / 100) * 10) / 10;
    const loanApprox = sloan <= 0;

    const score = Math.round(book.idleScore ?? 0);
    const ageContribution = Math.round(W_AGE * sage);
    const loanContribution = Math.round(W_LOAN * sloan);
    const isDecayFiltered = sdecay >= DECAY_THRESHOLD;

    return { score, ageYears, ageApprox, loanRate, loanApprox, ageContribution, loanContribution, isDecayFiltered };
}