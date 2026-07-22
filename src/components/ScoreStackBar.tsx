// 이관 우선순위 점수를 막대그래프로 표시하고, 클릭/탭 또는 마우스오버 시 점수 산정 근거를 툴팁으로 보여주는 컴포넌트
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { RelocationItem } from "../types";
import { NAV, BLUE, TEAL, RED } from "../constants/colors";
import { DEMAND_POINTS } from "../data/relocationQueue";
const TOOLTIP_WIDTH = 224;
const TOOLTIP_MARGIN = 8;
// 바 그래프의 개별 항목 시각 폭 상한(%). 실제 데이터 값이 아니라 UI 상 겹침 방지용 캡이라 별도 상수로 명시.
const BAR_VISUAL_CAP = 40;

interface TooltipPosition {
  top: number;
  left: number;
  placement: "above" | "below";
}

export function ScoreStackBar({ item }: { item: RelocationItem }) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);

  const demandRaw   = DEMAND_POINTS[item.genreDemand] ?? 70;
  const demandC     = +(demandRaw * 0.4).toFixed(1);
  const stockC      = +(item.stockShortage * 0.35).toFixed(1);
  const distPenalty = +(item.distance * 2.5).toFixed(1);
  const totalPos    = demandC + stockC;

  const demandPx = totalPos > 0 ? Math.round((demandC / totalPos) * item.score) : 0;
  const stockPx  = item.score - demandPx;

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
  // 모바일/터치 환경은 hover가 없으므로 탭으로 열고 닫을 수 있도록 토글 핸들러 추가
  const toggleTooltip = () => (tooltipPos ? hideTooltip() : computePosition());

  // 툴팁이 열려 있는 동안 바깥을 탭하면 닫히도록 처리 (터치 환경 대응)
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
    { label: "장르 수요",   weight: "×0.40",  raw: demandRaw,          contrib: `+${demandC}`,     color: BLUE, bar: demandC   },
    { label: "재고 부족률", weight: "×0.35",  raw: item.stockShortage, contrib: `+${stockC}`,      color: TEAL, bar: stockC    },
    { label: "거리 패널티", weight: "−×0.25", raw: item.distance,      contrib: `−${distPenalty}`, color: RED,  bar: distPenalty },
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
      aria-label="점수 구성 요소 보기"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTooltip(); } }}
    >
      <div className="flex items-center gap-2">
        <div className="w-20 h-3 bg-muted rounded-sm overflow-hidden flex flex-shrink-0">
          <div style={{ width: `${demandPx}%`, backgroundColor: BLUE }} />
          <div style={{ width: `${stockPx}%`,  backgroundColor: TEAL }} />
        </div>
        <span className="text-xs font-bold flex-shrink-0" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>
          {item.score}
        </span>
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
          <p className="text-[11px] font-semibold text-foreground mb-2">점수 구성 요소</p>
          <p className="text-[9px] text-muted-foreground mb-2 leading-snug">
            ※ 반올림으로 인해 항목 합산치가 최종 점수와 소수점 단위로 다를 수 있습니다.
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
                      {row.raw}{row.label === "거리 패널티" ? " km" : ""}
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
            <span className="text-xs font-bold" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>{item.score}점</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: BLUE }} />장르수요</span>
            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: TEAL }} />재고부족률</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
