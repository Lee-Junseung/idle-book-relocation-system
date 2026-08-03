// 매칭 스코어(M)를 막대그래프로 표시하고, 클릭/탭 또는 마우스오버 시 점수 산정 근거를 툴팁으로 보여주는 컴포넌트
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { RelocationItem } from "../types";
import { NAV, BLUE, TEAL, AMBER, GREEN } from "../constants/colors";

const TOOLTIP_WIDTH = 224;
const TOOLTIP_MARGIN = 8;
// 바 그래프의 개별 항목 시각 폭 상한(%).
// 실제 데이터 값이 아니라 UI 상 겹침 방지용 캡이라 별도 상수로 명시.
const BAR_VISUAL_CAP = 40;

interface TooltipPosition {
  top: number;
  left: number;
  placement: "above" | "below";
}

export function ScoreStackBar({ item }: { item: RelocationItem }) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);

  // Fdist는 0~1 값이다 (1 / (1 + e^(0.2×(d−15)))).
  // 나머지 세 지표(Sdemand/Sgap/Sspace)는 0~100 스케일이라 그대로 가중합하면 거리 요소의 영향력이 사실상 사라지므로, 100배 스케일링 후 0.3 가중치를 적용한다.
  // 실질 가중치는 0.3×100 = 30.
  const distC = +(item.fDist * 30).toFixed(1);
  const demandC = +(item.sDemand * 0.25).toFixed(1);
  const gapC = +(item.sGap * 0.25).toFixed(1);
  const spaceC = +(item.sSpace * 0.2).toFixed(1);

  const total = distC + demandC + gapC + spaceC;

  const rows = [
    { label: "거리 감쇄", weight: "×0.30", raw: (item.fDist * 100).toFixed(1), contrib: `+${distC}`, color: BLUE, bar: distC },
    { label: "도서 수요도", weight: "×0.25", raw: `${item.sDemand}`, contrib: `+${demandC}`, color: TEAL, bar: demandC },
    { label: "수급 불일치 해소", weight: "×0.25", raw: `${item.sGap}`, contrib: `+${gapC}`, color: AMBER, bar: gapC },
    {
      label: "공간 효율성",
      weight: "×0.20",
      raw: item.isSmallLibrary ? `${item.sSpace} (소규모 +15 반영)` : `${item.sSpace}`,
      contrib: `+${spaceC}`,
      color: GREEN,
      bar: spaceC,
    },
  ];

  // 상단 미니 스택바: 막대 전체 길이가 최종 점수(item.score, 0~100)를 나타내고, 그 길이 안에서 4개 지표의 기여도 비율만큼 색을 나눈다.
  const scoreCapped = Math.min(100, item.score);
  const segments = rows.map((row) => ({
    color: row.color,
    pct: total > 0 ? (row.bar / total) * scoreCapped : 0,
  }));

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
          {segments.map((seg, i) => (
            <div key={i} style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
          ))}
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
          <p className="text-[11px] font-semibold text-foreground mb-2">매칭 스코어 구성 요소</p>
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
            <span className="text-xs font-bold" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>{item.score}점</span>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: BLUE }} />거리감쇄</span>
            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: TEAL }} />수요도</span>
            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: AMBER }} />불일치해소</span>
            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm" style={{ backgroundColor: GREEN }} />공간효율성</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}