// 유휴화 점수를 막대그래프로 표시하고, 클릭/탭 또는 마우스오버 시 점수 산정 근거를 툴팁으로 보여주는 컴포넌트
// 점수 산출 공식(KDC 대분류별 가변 가중치): U_i = Wage(KDC) × Sage(i) + Wloan(KDC) × Sloan(i)
// Sdecay(대출 감소도)는 U-Score 합산에 포함되지 않고, U-Score 산출 후 "과거 베스트셀러 → 현재 유휴 전환" 패턴을 감지하는 보조 필터(Sdecay ≥ 90)로만 사용됨.
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Book } from "../types";
import { KdcGenre } from "../constants/genres";
import { NAV, AMBER, BROWN, RED } from "../constants/colors";

const TOOLTIP_WIDTH = 224;
const TOOLTIP_MARGIN = 8;
const BAR_VISUAL_CAP = 100;

// 이 컴포넌트에서만 쓰이므로 별도 파일로 분리하지 않음
const N_MAX = 10;           // Sage 임계 기준 경과 연수 (년)
const L_TARGET = 2.0;       // Sloan 목표 연평균 대출 횟수 (건/년)
const DECAY_THRESHOLD = 90; // Sdecay 보조 필터 임계값

// KDC 대분류별 U-Score 가중치 — 정보 반감기 특성(정보 노후 속도 vs 클래식/보존 가치)에 따라 상이함.
// (전체 점수 자체는 서버가 계산한 idleScore를 그대로 사용하며, 아래 가중치는 툴팁의 "구성 요소 breakdown" 표시용)
const KDC_USCORE_WEIGHTS: Record<KdcGenre, { wAge: number; wLoan: number }> = {
    "총류": { wAge: 0.8, wLoan: 0.2 },
    "철학": { wAge: 0.2, wLoan: 0.8 },
    "종교": { wAge: 0.2, wLoan: 0.8 },
    "사회과학": { wAge: 0.5, wLoan: 0.5 },
    "자연과학": { wAge: 0.6, wLoan: 0.4 },
    "기술과학": { wAge: 0.7, wLoan: 0.3 },
    "예술": { wAge: 0.3, wLoan: 0.7 },
    "언어": { wAge: 0.3, wLoan: 0.7 },
    "문학": { wAge: 0.1, wLoan: 0.9 },
    "역사": { wAge: 0.1, wLoan: 0.9 },
};
// 장르가 KDC 10종 대분류에 매칭되지 않는 경우(예: "미분류")의 폴백 — 노후도/저조도를 동일 비중으로 반영
const DEFAULT_USCORE_WEIGHT = { wAge: 0.5, wLoan: 0.5 };

function getUScoreWeights(genre: string): { wAge: number; wLoan: number } {
    return (KDC_USCORE_WEIGHTS as Record<string, { wAge: number; wLoan: number }>)[genre] ?? DEFAULT_USCORE_WEIGHT;
}

interface IdleScoreResult {
    score: number;
    wAge: number;
    wLoan: number;
    ageYears: number;
    ageApprox: boolean;
    ageContribution: number;
    loanRate: number;
    loanApprox: boolean;
    loanContribution: number;
    sdecay: number;
    isDecayFiltered: boolean;
}

function computeIdleScore(book: Book): IdleScoreResult {
    const sage = book.sage ?? 0;
    const sloan = book.sloan ?? 0;
    const sdecay = book.sdecay ?? 0;
    const { wAge, wLoan } = getUScoreWeights(book.genre);

    // Sage(i) = min(100, (Ai / Nmax) × 100)  →  Ai = (Sage / 100) × Nmax
    const ageYears = Math.round((sage / 100) * N_MAX * 10) / 10;
    const ageApprox = sage >= 100;

    // Sloan(i) = 100 × (1 - min(1, Vloan / Ltarget))  →  Vloan = Ltarget × (1 - Sloan / 100)
    const loanRate = Math.round(L_TARGET * (1 - sloan / 100) * 10) / 10;
    const loanApprox = sloan <= 0;

    const score = Math.round(book.idleScore ?? 0);
    const ageContribution = Math.round(wAge * sage);
    const loanContribution = Math.round(wLoan * sloan);
    const isDecayFiltered = sdecay >= DECAY_THRESHOLD;

    return {
        score, wAge, wLoan, ageYears, ageApprox, loanRate, loanApprox,
        ageContribution, loanContribution, sdecay, isDecayFiltered,
    };
}

interface TooltipPosition {
    top: number;
    left: number;
    placement: "above" | "below";
}

export function IdleScoreBar({ book }: { book: Book }) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);

    const {
        score,
        wAge,
        wLoan,
        ageYears,
        ageApprox,
        ageContribution,
        loanRate,
        loanApprox,
        loanContribution,
        sdecay,
        isDecayFiltered,
    } = computeIdleScore(book);

    // wAge + wLoan = 1 이므로 두 기여도의 합이 곧 100점 만점 중 실제 점유 폭(%)이 됨.
    const agePx = Math.round(ageContribution);
    const loanPx = Math.round(loanContribution);

    const computePosition = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const placement: "above" | "below" = spaceAbove >= spaceBelow ? "above" : "below";

        const left = Math.min(
            Math.max(TOOLTIP_MARGIN, rect.left),
            window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN
        );
        const top = placement === "above" ? rect.top - TOOLTIP_MARGIN : rect.bottom + TOOLTIP_MARGIN;

        setTooltipPos({ top, left, placement });
    };

    const hideTooltip = () => setTooltipPos(null);
    const toggleTooltip = () => (tooltipPos ? hideTooltip() : computePosition());
    const isTooltipOpen = tooltipPos !== null;

    useEffect(() => {
        if (!tooltipPos) return;
        const handleOutside = (e: MouseEvent | TouchEvent) => {
            if (!triggerRef.current?.contains(e.target as Node)) hideTooltip();
        };
        document.addEventListener("touchstart", handleOutside);
        document.addEventListener("mousedown", handleOutside);
        return () => {
            document.removeEventListener("touchstart", handleOutside);
            document.removeEventListener("mousedown", handleOutside);
        };
    }, [tooltipPos]);

    // 툴팁이 열려 있는 동안 스크롤이 일어나면(페이지 전체든, 테이블처럼 내부 스크롤 컨테이너든) 트리거 요소의 화면상 좌표가 바뀌므로 매번 다시 계산해서 툴팁이 항상 트리거를 따라가게 한다.
    // 스크롤 이벤트는 버블링되지 않으므로 document에 캡처 단계로 리스너를 걸어야 내부 스크롤 컨테이너(예: overflow-x-auto 테이블 래퍼)의 스크롤도 감지할 수 있다.
    // 의존성 배열을 tooltipPos 전체가 아닌 isTooltipOpen(boolean)으로 둬서, 스크롤 중 computePosition이 tooltipPos를 갱신할 때마다 리스너가 매번 해제/재등록되는 것을 방지한다.
    useEffect(() => {
        if (!isTooltipOpen) return;
        const handleScroll = () => computePosition();
        document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
        return () => document.removeEventListener("scroll", handleScroll, { capture: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTooltipOpen]);

    // U-Score에 실제로 합산되는 두 지표만 포함 (가중치는 도서 장르의 KDC 대분류에 따라 달라짐)
    const rows = [
        {
            label: "정보 노후도", weight: `×${wAge}`,
            raw: ageApprox ? "10년+" : `${ageYears}년`,
            contrib: `+${ageContribution}`, color: AMBER, bar: ageContribution,
        },
        {
            label: "대출 저조도", weight: `×${wLoan}`,
            raw: loanApprox ? "2.0+건/년" : `${loanRate.toFixed(1)}건/년`,
            contrib: `+${loanContribution}`, color: BROWN, bar: loanContribution,
        },
    ];

    return (
        <div
            ref={triggerRef}
            className="relative"
            onMouseEnter={computePosition}
            onMouseLeave={hideTooltip}
            onClick={toggleTooltip}
            role="button"
            tabIndex={0}
            aria-label="유휴화 점수 구성 요소 보기"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTooltip(); } }}
        >
            <div className="flex items-center gap-2">
                <div className="w-20 h-3 bg-muted rounded-sm overflow-hidden flex flex-shrink-0">
                    <div style={{ width: `${agePx}%`, backgroundColor: AMBER }} />
                    <div style={{ width: `${loanPx}%`, backgroundColor: BROWN }} />
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>
                    {score}
                </span>
                {isDecayFiltered && (
                    <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: RED }}
                        title="과거 베스트셀러 → 현재 유휴 전환 (대출 감소도 보조 필터 대상)"
                    />
                )}
            </div>

            {tooltipPos && createPortal(
                <div
                    className="fixed z-50 bg-card border border-border rounded-md shadow-xl p-3 pointer-events-none"
                    style={{
                        top: tooltipPos.top,
                        left: tooltipPos.left,
                        width: TOOLTIP_WIDTH,
                        transform: tooltipPos.placement === "above" ? "translateY(-100%)" : undefined,
                    }}
                >
                    <p className="text-[11px] font-semibold text-foreground mb-2">유휴화 점수 구성 요소</p>
                    <p className="text-[9px] text-muted-foreground mb-2 leading-snug">
                        ※ 정보 노후도·대출 저조도 가중치는 도서 장르(KDC 대분류)마다 다르게 적용된 값입니다.
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {rows.map((row) => (
                            <div key={row.label}>
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: row.color }} />
                                        <span className="text-[10px] text-foreground font-medium">{row.label}</span>
                                        <span className="text-[9px] text-muted-foreground">{row.weight}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                            {row.raw}
                                        </span>
                                        <span className="text-[10px] font-bold" style={{ color: row.color, fontFamily: "'JetBrains Mono', monospace" }}>
                                            {row.contrib}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(row.bar, BAR_VISUAL_CAP)}%`, backgroundColor: row.color, opacity: 0.7 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-foreground">최종 점수</span>
                        <span className="text-xs font-bold" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>{score}점</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-foreground font-medium">대출 감소도</span>
                            <span className="text-[10px] font-bold" style={{ color: RED, fontFamily: "'JetBrains Mono', monospace" }}>{sdecay.toFixed(1)}점</span>
                        </div>
                    </div>
                    {isDecayFiltered && (
                        <p className="mt-2 pt-2 border-border text-[9px] text-muted-foreground leading-snug">
                            최근 1년간 대출 급감이 감지되었습니다. (대출 감소도 ≥ {DECAY_THRESHOLD})
                        </p>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
