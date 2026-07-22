// 손상 표기용 컴포넌트
import { getDotColor, getDotLabel } from "./lib";

export function DamageDot({ level }: { level: number }) {
  const color = getDotColor(level);
  const label = getDotLabel(level);
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
      <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>({level}/5)</span>
    </div>
  );
}
