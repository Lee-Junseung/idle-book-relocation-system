// 카드 컴포넌트
import type { ReactNode, CSSProperties } from "react";

export function Card({ children, className = "", style }: {
  children: ReactNode; className?: string; style?: CSSProperties;
}) {
  return <div className={`bg-card border border-border rounded-md ${className}`} style={style}>{children}</div>;
}
