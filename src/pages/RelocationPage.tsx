// 이관 우선순위 큐를 보여주고, 개별/선택 이관 실행을 확인 모달을 통해 처리하는 페이지
import { Fragment, useState, useEffect, useCallback } from "react";
import {
  Truck, ArrowRight, ArrowLeft, Check, Clock,
  Pin, ChevronDown, ChevronUp, Loader2,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from "lucide-react";

import { Card, SectionHeader, ScoreStackBar, ConfirmModal, withAlpha } from "../components";
import { NAV, BLUE, GREEN, RED } from "../constants/colors";
// import { AMBER } from "../constants/colors";
import { getTransferListApi, executeTransferApi } from "../api/transfers";
import { ApiError } from "../api/client";
import {
  ACTIVE_TRANSFER_STATUSES,
  RelocationCandidate,
  RelocationItem,
  TransferErrorState,
  TransferScoreDetails,
  mapToRelocationItem,
} from "../types/transfers";
import { ModalConfig } from "../types";

import { CURRENT_LIBRARY } from "../constants/library";

const PAGE_SIZE = 10;

// 메인 추천 행과 대안 후보(alternatives) 행을 같은 셀 레이아웃으로 그리기 위한 공통 타입.
// 대안 후보는 서버가 scoreDetails를 내려주지 않으므로 optional.
type RowLike = RelocationCandidate & { scoreDetails?: TransferScoreDetails };

function statusMeta(status: RowLike["status"]) {
  switch (status) {
    case "IN_TRANSIT":
      return { label: "이송중", className: "text-blue-700", Icon: Truck };
    case "COMPLETED":
      return { label: "완료", className: "text-green-700", Icon: Check };
    default:
      return { label: "대기", className: "text-amber-600", Icon: Clock };
  }
}

function RelocationRowCells({ row, onExecute }: { row: RowLike; onExecute: (row: RowLike) => void }) {
  const isFrom = row.from === CURRENT_LIBRARY.name;
  const isTo = row.to === CURRENT_LIBRARY.name;
  const disabled = row.status !== "PENDING";
  const { label, className, Icon } = statusMeta(row.status);
  return (
    <>
      <td className="px-3 py-2.5 max-w-[160px]">
        <div className="flex items-center gap-1 text-xs whitespace-nowrap">
          <span className={`truncate ${isFrom ? "font-semibold" : "text-muted-foreground"}`} style={isFrom ? { color: NAV } : {}}>
            {isFrom && <Pin className="w-2.5 h-2.5 inline mr-0.5" />}{row.from}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className={`truncate ${isTo ? "font-semibold" : "text-muted-foreground"}`} style={isTo ? { color: NAV } : {}}>
            {isTo && <Pin className="w-2.5 h-2.5 inline mr-0.5" />}{row.to}
          </span>
        </div>
      </td>
      <td className="hidden lg:table-cell px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.distance} km</td>
      <td className="px-3 py-2.5"><ScoreStackBar score={row.score} scoreDetails={row.scoreDetails} /></td>
      <td className="hidden xl:table-cell px-3 py-2.5">
        {row.hubDirection === "발신" ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap"
            style={{ backgroundColor: withAlpha(BLUE, 0.08), color: BLUE, border: `1px solid ${withAlpha(BLUE, 0.19)}` }}>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
            <span>발신</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap"
            style={{ backgroundColor: withAlpha(GREEN, 0.08), color: GREEN, border: `1px solid ${withAlpha(GREEN, 0.19)}` }}>
            <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
            <span>수신</span>
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${className}`}>
          <Icon className="w-3 h-3 flex-shrink-0" />{label}
        </span>
      </td>
      <td className="px-2 sm:px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        {!disabled && (
          <button onClick={() => onExecute(row)}
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded text-white text-[11px] font-medium ml-auto hover:opacity-80 whitespace-nowrap"
            style={{ backgroundColor: NAV }}>
            <Truck className="w-3 h-3 flex-shrink-0" /><span className="hidden sm:inline">이관 실행</span>
          </button>
        )}
      </td>
    </>
  );
}

export function RelocationPage() {
  const [items, setItems] = useState<RelocationItem[] | null>(null);
  const [summary, setSummary] = useState({ totalPending: 0, totalSent: 0, totalReceived: 0 });
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages: 1, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TransferErrorState | null>(null);
  const [execError, setExecError] = useState<TransferErrorState | null>(null);
  const [executing, setExecuting] = useState(false);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dirFilter, setDirFilter] = useState<"전체" | "발신" | "수신">("전체");
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 이관 추천 목록 조회 (GET /api/transfers?status=PENDING,IN_TRANSIT&page=&size=)
  const fetchQueue = useCallback(async (targetPage = 0) => {
    setError(null);
    try {
      const json = await getTransferListApi(ACTIVE_TRANSFER_STATUSES, targetPage, PAGE_SIZE);
      setItems(json.content.map(mapToRelocationItem));
      setSummary(json.summary);
      setPageInfo({ totalPages: json.totalPages, totalElements: json.totalElements });
      setPage(json.pageable.pageNumber);
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ message: e.message, errorType: e.error, statusCode: e.statusCode });
      } else {
        setError({ message: e instanceof Error ? e.message : "이관 후보 데이터를 불러오지 못했습니다." });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(0); }, [fetchQueue]);

  const goToPage = (p: number) => {
    if (p === page || executing) return;
    setExpandedId(null);
    fetchQueue(p);
  };

  // 이관 실행 (POST /api/transfers/{recommendationId}/execute)
  // 백엔드에 일괄 실행 엔드포인트가 없어, 선택된 건수만큼 순차 호출한 뒤 목록을 다시 조회해 최신 상태를 반영한다.
  const doExecute = async (ids: number[]) => {
    setExecuting(true);
    setExecError(null);
    const results = await Promise.allSettled(ids.map((id) => executeTransferApi(id)));
    setSelected(new Set());

    const failedCount = results.filter((r) => r.status === "rejected").length;
    if (failedCount > 0) {
      const firstFailure = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      const reason = firstFailure?.reason;
      const detail = reason instanceof ApiError ? reason.message : "일부 이관 실행 요청이 실패했습니다.";
      setExecError({
        message: ids.length > 1 ? `${ids.length}건 중 ${failedCount}건 실행 실패: ${detail}` : detail,
        errorType: reason instanceof ApiError ? reason.error : undefined,
        statusCode: reason instanceof ApiError ? reason.statusCode : undefined,
      });
    }

    // 성공/실패 여부와 무관하게 서버의 최신 상태를 다시 불러온다 (Top5 매칭 종료 판정 등은 서버 응답 기준).
    await fetchQueue(page);
    setExecuting(false);
  };

  const requestExecuteRow = (row: RowLike, title: string) => {
    setModal({
      title: "이관 실행 확인",
      body: `"${title}" 을(를) ${row.from}에서 ${row.to}(으)로 이관하시겠습니까?`,
      detail: `이동 거리 ${row.distance} km · 매칭 스코어 ${row.score}점. 이관 실행 후 물리적 운반 일정을 별도로 조율해야 합니다.`,
      confirmLabel: "이관 실행",
      confirmColor: NAV,
      icon: "warning",
      onConfirm: () => { void doExecute([row.recommendationId]); },
    });
  };

  const requestExecuteSelected = () => {
    const ids = Array.from(selected);
    setModal({
      title: "선택 이관 실행 확인",
      body: `선택한 도서 ${ids.length}건을 일괄 이관 처리하시겠습니까?`,
      detail: "이관 처리 후 각 분관 담당자에게 운반 일정 안내가 필요합니다. 실행 전 물리적 이동 가능 여부를 반드시 확인하십시오.",
      confirmLabel: `${ids.length}건 이관 실행`,
      confirmColor: NAV,
      icon: "warning",
      onConfirm: () => { void doExecute(ids); },
    });
  };

  const toggleSel = (id: number) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (error) {
    return <Card className="p-6 text-sm" style={{ color: RED }}>이관 후보 데이터를 불러오지 못했습니다: {error.message}</Card>;
  }
  if (loading || !items) {
    return (
      <Card className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> 이관 후보 데이터를 불러오는 중...
      </Card>
    );
  }

  const filtered = items.filter((q) => dirFilter === "전체" || q.hubDirection === dirFilter);
  const pendingFiltered = filtered.filter((q) => q.status === "PENDING");
  const allSel = pendingFiltered.length > 0 && pendingFiltered.every((q) => selected.has(q.recommendationId));
  const toggleAll = () => allSel ? setSelected(new Set()) : setSelected(new Set(pendingFiltered.map((q) => q.recommendationId)));

  return (
    <>
      {modal && <ConfirmModal config={modal} onClose={() => setModal(null)} />}

      <div className="flex flex-col gap-4">
        <SectionHeader
          title="이관 우선순위 목록"
          sub="매칭 스코어 기반 이관 우선순위">
          <button onClick={requestExecuteSelected} disabled={selected.size === 0 || executing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ backgroundColor: NAV }}>
            {executing ? <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" /> : <Truck className="w-3.5 h-3.5 flex-shrink-0" />}
            일괄 이관 ({selected.size})
          </button>
        </SectionHeader>

        {execError && (
          <div className="px-4 py-3 rounded-md border border-red-200 bg-red-50 flex items-start gap-2.5 text-sm text-red-500">
            {execError.errorType && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 flex-shrink-0 whitespace-nowrap">
                {execError.statusCode ?? ""} {execError.errorType}
              </span>
            )}
            <span>이관 실행 실패: {execError.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { label: "총 대기 건수", value: summary.totalPending, color: NAV, unit: "건" },
            { label: "이번달 발신 건수", value: summary.totalSent, color: BLUE, unit: "건" },
            { label: "이번달 수신 건수", value: summary.totalReceived, color: GREEN, unit: "건" },
          ].map((s) => (
            <Card key={s.label} className="p-3 flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
              <span className="text-xl font-semibold" style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.value}{s.unit}
              </span>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-card border border-border rounded p-0.5">
            {(["전체", "발신", "수신"] as const).map((d) => (
              <button key={d} onClick={() => setDirFilter(d)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${dirFilter === d ? "text-white" : "text-muted-foreground hover:bg-muted"}`}
                style={dirFilter === d ? { backgroundColor: NAV } : {}}>
                {/* CURRENT_LIBRARY에는 shortName이 없어(shortAddress만 존재) name으로 대체 — 기존 코드의 사전 존재 버그 수정 */}
                {d === "전체" ? "전체 방향" : `${CURRENT_LIBRARY.name} ${d}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />대기</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" />이송중</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600" />완료</span>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="w-9 px-3 py-2.5">
                    <input type="checkbox" checked={allSel} onChange={toggleAll} className="rounded accent-primary" />
                  </th>
                  {[
                    { label: "", hide: "" },
                    { label: "도서 / 장르", hide: "" },
                    { label: "출발 → 목적지", hide: "" },
                    { label: "거리", hide: "hidden lg:table-cell" },
                    { label: "매칭 스코어", hide: "" },
                    { label: "방향", hide: "hidden xl:table-cell" },
                    { label: "상태", hide: "" },
                  ].map((h, i) => (
                    <th key={i} className={`px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${h.hide}`}>{h.label}</th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">사서 결정</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">표시할 이관 후보가 없습니다.</td></tr>
                )}
                {filtered.map((item) => {
                  const disabled = item.status !== "PENDING";
                  const isSel = selected.has(item.recommendationId);
                  const isOpen = expandedId === item.recommendationId;
                  return (
                    <Fragment key={item.recommendationId}>
                      <tr
                        onClick={() => setExpandedId(isOpen ? null : item.recommendationId)}
                        className={`border-b border-border last:border-0 transition-colors cursor-pointer
                        ${isOpen ? "bg-blue-50" : isSel ? "bg-blue-50" : "hover:bg-muted/30"} ${disabled ? "opacity-50" : ""}`}
                        style={isOpen ? { borderLeft: `2px solid ${NAV}`, borderBottom: "none" } : {}}>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} disabled={disabled} onChange={() => toggleSel(item.recommendationId)} className="rounded accent-primary" />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="p-1 rounded">
                            {isOpen
                              ? <ChevronUp className="w-4 h-4" style={{ color: NAV }} />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.genre}</p>
                        </td>
                        <RelocationRowCells row={item} onExecute={(row) => requestExecuteRow(row, item.title)} />
                      </tr>

                      {isOpen && item.alternatives.length === 0 && (
                        <tr className="border-b border-border last:border-0 bg-blue-50/40" style={{ borderLeft: `2px solid ${NAV}` }}>
                          <td colSpan={9} className="px-3 py-2.5 text-[11px] text-muted-foreground">다른 대안 후보가 없습니다.</td>
                        </tr>
                      )}
                      {isOpen && item.alternatives.map((alt) => (
                        <tr key={`alt-${item.recommendationId}-${alt.recommendationId}`}
                          className="border-b border-border last:border-0 bg-blue-50/40"
                          style={{ borderLeft: `2px solid ${NAV}` }}>
                          <td colSpan={3} className="px-3 py-2.5"></td>
                          <RelocationRowCells row={alt} onExecute={(row) => requestExecuteRow(row, item.title)} />
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex flex-wrap items-center gap-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">매칭 스코어 산출식:</span>
            <span className="text-[11px] text-muted-foreground">
              M = 거리 감쇄(30%) + 장르 수요도(25%) + 수급 불일치 해소(25%) + 공간 효율성(20%)
            </span>
          </div>
          {pageInfo.totalPages > 1 && (() => {
            const WINDOW = 5;
            const start = Math.floor(page / WINDOW) * WINDOW;
            const end = Math.min(pageInfo.totalPages - 1, start + WINDOW - 1);
            const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

            const navBtnClass =
              "w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors";

            return (
              <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-end gap-1">
                <button onClick={() => goToPage(0)} disabled={executing || page === 0} className={navBtnClass} aria-label="처음 페이지">
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => goToPage(page - 1)} disabled={executing || page === 0} className={navBtnClass} aria-label="이전 페이지">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {pages.map((p) => (
                  <button key={p} onClick={() => goToPage(p)} disabled={executing}
                    className={`w-8 h-8 text-sm rounded border font-medium transition-colors disabled:opacity-50
            ${p === page ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {p + 1}
                  </button>
                ))}

                <button onClick={() => goToPage(page + 1)} disabled={executing || page === pageInfo.totalPages - 1} className={navBtnClass} aria-label="다음 페이지">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => goToPage(pageInfo.totalPages - 1)} disabled={executing || page === pageInfo.totalPages - 1} className={navBtnClass} aria-label="끝 페이지">
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })()}
        </Card>
      </div>
    </>
  );
}
