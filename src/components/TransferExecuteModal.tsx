// RelocationPage 전용 "이관 실행 확인" 모달.
import { useEffect, useRef } from "react";
import { Truck, ArrowRight, X, Info } from "lucide-react";
import { NAV, AMBER } from "../constants/colors";
import { withAlpha } from "./lib";
import { ScoreStackBar } from "./ScoreStackBar";
import { TransferExecuteModalConfig } from "../types/transfers";

export function TransferExecuteModal({ config, onClose }: { config: TransferExecuteModalConfig; onClose: () => void }) {
    const { targets } = config;
    const isBatch = targets.length > 1;
    const containerRef = useRef<HTMLDivElement>(null);

    // Esc 키로 닫기 + 모달 진입 시 포커스 이동 (ConfirmModal과 동일한 접근성 처리)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        containerRef.current?.focus();
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const totalDistance = targets.reduce((sum, t) => sum + t.distance, 0);
    const avgScore = Math.round(targets.reduce((sum, t) => sum + t.score, 0) / targets.length);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

            <div
                ref={containerRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="transfer-execute-modal-title"
                tabIndex={-1}
                className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden focus:outline-none"
            >
                <div className="h-1 w-full" style={{ backgroundColor: NAV }} />

                <div className="p-6">
                    <div className="flex items-start gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ring-1"
                            style={{ backgroundColor: withAlpha(NAV, 0.1), boxShadow: `inset 0 0 0 1px ${withAlpha(NAV, 0.15)}` }}>
                            <Truck className="w-5 h-5" style={{ color: NAV }} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h3 id="transfer-execute-modal-title" className="text-foreground font-semibold text-[15px]">
                                {isBatch ? `${targets.length}건 일괄 이관 실행` : "이관 실행 확인"}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                {isBatch
                                    ? "선택한 도서를 일괄로 이관 처리합니다. 분관 담당자와 운반 일정을 사전에 조율하세요."
                                    : `"${targets[0].title}" 을(를) 이관 처리합니다.`}
                            </p>
                        </div>
                        <button onClick={onClose} aria-label="닫기" className="p-1.5 -mt-1 -mr-1 rounded-md hover:bg-muted transition-colors flex-shrink-0 text-muted-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {isBatch && (
                        <div className="mb-4 grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 flex flex-col gap-0.5">
                                <p className="text-[10px] text-muted-foreground">대상 건수</p>
                                <p className="text-sm font-bold leading-tight" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>{targets.length}건</p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 flex flex-col gap-0.5">
                                <p className="text-[10px] text-muted-foreground">총 이동 거리</p>
                                <p className="text-sm font-bold leading-tight" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>{totalDistance.toFixed(1)}km</p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 flex flex-col gap-0.5">
                                <p className="text-[10px] text-muted-foreground">평균 매칭 스코어</p>
                                <p className="text-sm font-bold leading-tight" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>{avgScore}점</p>
                            </div>
                        </div>
                    )}

                    {/* 단건: 경로/거리/매칭 스코어 표를 그대로 재사용해 실행 전 다시 확인시킨다. */}
                    {!isBatch && (
                        <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3.5 py-3 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <span className="truncate">{targets[0].from}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{targets[0].to}</span>
                                <span className="ml-auto flex-shrink-0 text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                    {targets[0].distance}km
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">매칭 스코어</span>
                                <ScoreStackBar score={targets[0].score} scoreDetails={targets[0].scoreDetails} />
                            </div>
                        </div>
                    )}

                    {/* 일괄: 대상 목록을 스크롤 가능한 리스트로 보여준다. */}
                    {isBatch && (
                        <div className="mb-4 rounded-lg border border-border overflow-hidden">
                            <div className="px-3.5 py-2 border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                이관 대상 목록
                            </div>
                            <div className="max-h-40 overflow-y-auto divide-y divide-border">
                                {targets.map((t) => (
                                    <div key={t.recommendationId} className="px-3.5 py-2.5 flex items-center gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                                            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                                {t.from}<ArrowRight className="w-2.5 h-2.5 inline flex-shrink-0" />{t.to}
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold flex-shrink-0" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>
                                            {t.score}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 폐기 등 파괴적 작업(ConfirmModal의 RED 경고)과 구분되도록 이관은 "운영/조율" 성격의 주의 문구를 AMBER로 표시 */}
                    <div className="mb-5 flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs font-medium leading-relaxed"
                        style={{ backgroundColor: withAlpha(AMBER, 0.06), borderColor: withAlpha(AMBER, 0.25), color: AMBER }}>
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>이관 실행 후에는 취소할 수 없습니다. 실행 즉시 담당 분관에 운반 일정 조율을 요청해야 합니다.</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button onClick={onClose}
                            className="px-4 py-2 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                            취소
                        </button>
                        <button
                            onClick={() => { config.onConfirm(); onClose(); }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-85"
                            style={{ backgroundColor: NAV }}>
                            <Truck className="w-3.5 h-3.5" />
                            {isBatch ? `${targets.length}건 이관 실행` : "이관 실행"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
