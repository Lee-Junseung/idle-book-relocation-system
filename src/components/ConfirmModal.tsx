// 폐기/이관/보존 등 되돌릴 수 없는 작업을 실행하기 전에 확인받는 모달 컴포넌트
import { useEffect, useRef } from "react";
import { ShieldAlert, AlertTriangle, X, AlertCircle, Trash2 } from "lucide-react";
import { ModalConfig } from "../types";
import { RED } from "../constants/colors";
import { withAlpha, getDotColor, getDotLabel } from "./lib";

export function ConfirmModal({ config, onClose }: { config: ModalConfig; onClose: () => void }) {
  const accentColor = config.confirmColor ?? RED;
  const bi = config.bookInfo;
  const dmg = bi ? { label: getDotLabel(bi.damage), color: getDotColor(bi.damage) } : null;
  const containerRef = useRef<HTMLDivElement>(null);

  // 버그 수정: ModalConfig.icon("danger"/"warning")이 타입에는 있었지만 실제로 안 쓰이고 있었음
  const HeaderIcon = config.icon === "warning" ? AlertTriangle : ShieldAlert;

  // Esc 키로 닫기 + 모달 진입 시 포커스 이동 (접근성 보완)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    containerRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-body"
        tabIndex={-1}
        className="relative bg-card border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden focus:outline-none"
      >
        <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: withAlpha(accentColor, 0.08) }}>
              <HeaderIcon className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="confirm-modal-title" className="text-foreground font-semibold text-sm">{config.title}</h3>
              <p id="confirm-modal-body" className="text-xs text-muted-foreground mt-1 leading-relaxed">{config.body}</p>
            </div>
            <button onClick={onClose} aria-label="닫기" className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {config.summaryItems && config.summaryItems.length > 0 && (
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {config.summaryItems.map((s) => (
                <div key={s.label} className="rounded-md border border-border bg-muted/20 px-3 py-2.5 flex flex-col gap-0.5">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold leading-tight" style={{ color: s.color, fontFamily:"'JetBrains Mono', monospace" }}>{s.value}</p>
                  {s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {bi && dmg && (
            <div className="mb-4 rounded-md border border-border bg-muted/30 overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">처리 대상 도서 정보</span>
                <span className="text-[10px] font-mono text-muted-foreground">{bi.id}</span>
              </div>
              <div className="px-3 py-2.5 flex flex-col gap-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">{bi.title}</p>
                  <p className="text-[11px] text-muted-foreground">{bi.author} · {bi.branch}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-card rounded border border-border px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">최근 대출일</p>
                    <p className="text-xs font-semibold text-foreground" style={{ fontFamily:"'JetBrains Mono', monospace" }}>{bi.lastLoan}</p>
                  </div>
                  <div className="bg-card rounded border border-border px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">마모 수준</p>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dmg.color }} />
                      <p className="text-xs font-semibold" style={{ color: dmg.color }}>{dmg.label} {bi.damage}/5</p>
                    </div>
                  </div>
                  <div className="bg-card rounded border border-border px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">연 대출률</p>
                    <p className="text-xs font-semibold text-foreground" style={{ fontFamily:"'JetBrains Mono', monospace" }}>{bi.turnover.toFixed(1)}/yr</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {config.detail && (
            <div className="mb-3 px-3 py-2.5 rounded border text-xs text-muted-foreground leading-relaxed"
              style={{ backgroundColor: withAlpha(accentColor, 0.03), borderColor: withAlpha(accentColor, 0.19) }}>
              <span className="font-medium" style={{ color: accentColor }}>주의: </span>
              {config.detail}
            </div>
          )}

          <div className="mb-5 flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium"
            style={{ backgroundColor: withAlpha(RED, 0.03), borderColor: withAlpha(RED, 0.15), color: RED }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>이 작업은 되돌릴 수 없습니다. 사서의 최종 책임 하에 실행됩니다.</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              취소
            </button>
            <button
              onClick={() => { config.onConfirm(); onClose(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold text-white transition-opacity hover:opacity-85"
              style={{ backgroundColor: accentColor }}>
              <Trash2 className="w-3.5 h-3.5" />
              {config.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
