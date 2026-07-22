// 섹션 타이틀 + 부제 + 우측 액션 영역을 표시하는 공통 헤더 컴포넌트
import type { ReactNode } from "react";

export function SectionHeader({ title, sub, children }: {
  title: string; sub?: string; children?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
      <div>
        <h2 className="text-foreground text-lg font-semibold" style={{ fontFamily: "var(--font-serif)" }}>{title}</h2>
        {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
      </div>
      {children && <div className="flex items-center flex-wrap gap-2 sm:flex-shrink-0">{children}</div>}
    </div>
  );
}
