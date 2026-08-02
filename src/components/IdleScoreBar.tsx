// 유휴화 점수를 막대그래프로 표시하고, 클릭/탭 또는 마우스오버 시 점수 산정 근거를 툴팁으로 보여주는 컴포넌트
// ScoreStackBar.tsx(이관 우선순위 점수)와 동일한 인터랙션 패턴을 따름
// 점수 산출 공식: 유휴화점수_상호대차매칭_알고리즘.pdf §1 (Ui = Wage(KDC)·Sage + Wloan(KDC)·Sloan)
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Book } from "../types";
import { NAV, AMBER, BROWN } from "../constants/colors";
import { computeIdleScore } from "../data/idleScore";

const TOOLTIP_WIDTH = 224;
const TOOLTIP_MARGIN = 8;
const BAR_VISUAL_CAP = 100;

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
        ageYears,
        ageApprox,
        ageContribution,
        loanRate,
        loanApprox,
        loanContribution,
        isDecayFiltered,
    } = computeIdleScore(book);

    // 두 기여도 값 자체가 100점 만점 중 실제 점유 폭(%)이므로 그대로 바 너비로 사용
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

    const rows = [
        {
            label: "정보 노후도", weight: "Wage(KDC)",
            raw: ageApprox ? "10년+" : `${ageYears}년`,
            contrib: `+${ageContribution}`, color: AMBER, bar: ageContribution,
        },
        {
            label: "대출 저조도", weight: "Wloan(KDC)",
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
                        style={{ backgroundColor: BROWN }}
                        title="최근 1년간 대출 급감 (보조 필터 대상)"
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
                        ※ KDC별 가중치(Wage/Wloan)는 아직 확정되지 않아 임시로 균등 가중치를 적용한 값입니다.
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
                    {isDecayFiltered && (
                        <p className="mt-2 pt-2 border-t border-border text-[9px] text-muted-foreground leading-snug">
                            최근 1년간 대출 급감이 감지되어 보조 필터(Sdecay ≥ 90) 대상으로 표시되었습니다.
                        </p>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}