// 수요 등급 태그 컴포넌트
import type { DemandLevel } from "../types";

// 개선: 컴포넌트 렌더될 때마다 객체를 새로 만들지 않도록 모듈 스코프로 이동
const DEMAND_STYLE_MAP: Record<DemandLevel, string> = {
  "높음": "bg-red-100 text-red-700 border-red-200",
  "보통": "bg-amber-100 text-amber-700 border-amber-200",
  "낮음": "bg-slate-100 text-slate-600 border-slate-200",
};

export function DemandTag({ level }: { level: DemandLevel }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium ${DEMAND_STYLE_MAP[level]}`}>{level}</span>;
}
