// 대시보드 상단 지표(값/트렌드/아이콘)를 보여주는 카드 컴포넌트
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { Card } from "./Card";
import { NAV } from "../constants/colors";
import { withAlpha } from "./lib";

// 커스텀 CSS 변수(--tw-ring-color)를 CSSProperties에 안전하게 얹기 위한 타입 확장
type StyleWithCssVars = CSSProperties & { [key: `--${string}`]: string | number };

export function MetricCard({ label, value, sub, trend, color, icon: Icon, highlight, invertTrend }: {
  label: string; value: string; sub: string; trend?: string; color: string; icon: LucideIcon; highlight?: boolean; invertTrend?: boolean;
}) {
  const isUp = trend?.startsWith("+");
  const isPositive = invertTrend ? !isUp : isUp;
  const ringStyle: StyleWithCssVars = highlight ? { "--tw-ring-color": NAV } : {};
  return (
    <Card className={`p-4 flex flex-col gap-2 ${highlight ? "ring-2 ring-offset-1" : ""}`}
      style={ringStyle}>
      {highlight && (
        <div className="flex items-center gap-1 -mt-1 mb-0.5">
          <span className="text-[10px] text-muted-foreground">북수원도서관</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: withAlpha(color, 0.09) }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <div className="text-[1.55rem] font-semibold text-foreground leading-none" style={{ fontFamily:"'JetBrains Mono', monospace" }}>
        {value}
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        {trend && (
          <span className={`flex items-center gap-0.5 font-medium ${isPositive ? "text-green-600" : "text-red-500"}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
        <span className="text-muted-foreground">{sub}</span>
      </div>
    </Card>
  );
}
