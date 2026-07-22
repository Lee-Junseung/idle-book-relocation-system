// 차트 커스텀 툴팁 컴포넌트
interface ChartTooltipPayloadItem {
  name: string;
  value: number | string;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        // key: name이 중복될 수 있어 index를 함께 조합해 충돌 방지
        <div key={`${p.name}-${i}`} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {/* 개선: value가 숫자가 아닐 수 있으므로 toLocaleString 호출 전 타입 체크 */}
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
