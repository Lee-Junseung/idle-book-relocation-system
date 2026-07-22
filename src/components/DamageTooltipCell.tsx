// 테이블 셀/툴팁용 컴포넌트
import { Book } from "../types";
import { getDotColor, getDotLabel } from "./lib";

export function DamageTooltipCell({ book }: { book: Book }) {
  // 개선: 기존 개별 fallback(|| "#9CA3AF") 로직을 공용 유틸(getDotColor/getDotLabel)로 통일
  const dmgColor = getDotColor(book.damage);
  const dmgLabel = getDotLabel(book.damage);

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dmgColor }} />
      <span className="text-xs font-medium" style={{ color: dmgColor }}>{dmgLabel}</span>
      <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        ({book.damage}/5)
      </span>
    </div>
  );
}
