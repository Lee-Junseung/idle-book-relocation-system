// 이관 우선순위 큐를 보여주고, 개별/선택 이관 실행을 확인 모달을 통해 처리하는 페이지
import { Fragment, useState, useEffect, useCallback } from "react";
import {
  Truck, ArrowRight, ArrowLeft, Check, Clock,
  Pin, ChevronDown, ChevronUp, Loader2,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from "lucide-react";

import { Card, SectionHeader, ScoreStackBar, TransferExecuteModal, withAlpha } from "../components";
import { NAV, BLUE, GREEN, RED } from "../constants/colors";
import { getTransferListApi, executeTransferApi } from "../api/transfers";
import { ApiError } from "../api/client";
import {
  ACTIVE_TRANSFER_STATUSES,
  RelocationCandidate,
  RelocationItem,
  TransferErrorState,
  TransferExecuteModalConfig,
  TransferExecuteTarget,
  mapToRelocationItem,
} from "../types/transfers";

import { CURRENT_LIBRARY } from "../constants/library";

const PAGE_SIZE = 10;

// 메인 추천 행과 대안 후보(alternatives) 행을 같은 셀 레이아웃으로 그리기 위한 공통 타입.
// 서버가 메인 추천/대안 후보 모두 scoreDetails를 내려주므로 RelocationCandidate를 그대로 사용한다.
type RowLike = RelocationCandidate;

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
      <td className="px-3 sm:px-4 py-2.5 max-w-[160px]">
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
      <td className="hidden lg:table-cell px-3 sm:px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.distance} km</td>
      <td className="px-3 sm:px-4 py-2.5"><ScoreStackBar score={row.score} scoreDetails={row.scoreDetails} /></td>
      <td className="hidden xl:table-cell px-3 sm:px-4 py-2.5">
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
      <td className="px-3 sm:px-4 py-2.5">
        <span className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${className}`}>
          <Icon className="w-3 h-3 flex-shrink-0" />{label}
        </span>
      </td>
      <td className="px-2 sm:px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
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

// 상세 파트(메인 추천) 1건 + 대안 후보(alternatives) 여러 건이 같은 도서를 두고 경쟁하는 한 세트다.
// 이 중 하나라도 이관을 실행하면 나머지 후보는 더 이상 유효하지 않으므로, 새로고침 없이도 즉시 "완료" 상태로 표시하고 실행 버튼이 사라지도록 로컬 상태를 낙관적으로 먼저 갱신한다.
function applyExecutionResult(list: RelocationItem[], executedIds: Set<number>): RelocationItem[] {
  return list.map((item) => {
    const mainExecuted = executedIds.has(item.recommendationId);
    const altExecuted = item.alternatives.some((a) => executedIds.has(a.recommendationId));
    if (!mainExecuted && !altExecuted) return item;

    return {
      ...item,
      status: mainExecuted ? "IN_TRANSIT" : "COMPLETED",
      alternatives: item.alternatives.map((a) =>
        executedIds.has(a.recommendationId) ? { ...a, status: "IN_TRANSIT" } : { ...a, status: "COMPLETED" }
      ),
    };
  });
}

// 방금 실행한 세트는 메인 추천 status가 COMPLETED로 바뀌어 다음 목록 재조회(status=PENDING,IN_TRANSIT 필터) 응답에서 통째로 빠질 수 있다.
// 재조회 결과에서 빠졌다고 화면에서 바로 사라져 버리면 "나머지는 완료 상태로 표시"라는 요구가 재조회 한 번에 무너지므로, 방금 실행으로 종료된 세트는 낙관적으로 갱신했던 결과를 그대로 화면에 남겨둔다
// (다음 페이지 이동/새로고침 시에는 서버 응답을 따른다).
function mergeAfterRefetch(
  fresh: RelocationItem[],
  prevPatched: RelocationItem[] | null,
  executedIds: Set<number>
): RelocationItem[] {
  if (!prevPatched || executedIds.size === 0) return fresh;
  const freshIds = new Set(fresh.map((i) => i.recommendationId));
  const keptStale = prevPatched.filter((p) => {
    if (freshIds.has(p.recommendationId)) return false;
    return executedIds.has(p.recommendationId) || p.alternatives.some((a) => executedIds.has(a.recommendationId));
  });
  if (keptStale.length === 0) return fresh;
  const merged = [...fresh];
  keptStale.forEach((item) => {
    const idx = prevPatched.findIndex((p) => p.recommendationId === item.recommendationId);
    merged.splice(Math.min(Math.max(idx, 0), merged.length), 0, item);
  });
  return merged;
}

export function RelocationPage() {
  const [items, setItems] = useState<RelocationItem[] | null>(null);
  const [summary, setSummary] = useState({ totalPending: 0, totalSent: 0, totalReceived: 0 });
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TransferErrorState | null>(null);
  const [execError, setExecError] = useState<TransferErrorState | null>(null);
  const [executing, setExecuting] = useState(false);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dirFilter, setDirFilter] = useState<"전체" | "발신" | "수신">("전체");
  const [modal, setModal] = useState<TransferExecuteModalConfig | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 이관 추천 목록 조회 (GET /api/transfers?status=PENDING,IN_TRANSIT&page=&size=)
  // executedIds: 방금 이관 실행이 일어난 recommendationId 집합.
  // 지정하면 재조회 응답에서 빠진 항목이라도(완료되어 필터에서 제외된 경우) 화면에서 곧바로 사라지지 않도록 보존한다.
  const fetchQueue = useCallback(async (targetPage = 0, executedIds: Set<number> = new Set()) => {
    setError(null);
    try {
      const json = await getTransferListApi(ACTIVE_TRANSFER_STATUSES, targetPage, PAGE_SIZE);
      const fresh = json.content.map(mapToRelocationItem);
      setItems((prev) => mergeAfterRefetch(fresh, prev, executedIds));
      setSummary(json.summary);
      setPageInfo({ totalPages: json.totalPages });
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

    const executedIdSet = new Set(ids);
    // 요청이 끝나기를 기다리지 않고, 같은 세트(상세 파트 포함 메인 추천 + 대안 후보)의 나머지
    // 항목을 먼저 "완료" 상태·버튼 숨김으로 낙관적 반영한다 (클릭 즉시 반응하는 느낌을 주기 위함).
    setItems((prev) => (prev ? applyExecutionResult(prev, executedIdSet) : prev));

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
    // 방금 실행한 세트는 재조회 응답에서 빠지더라도 화면에서 사라지지 않도록 executedIdSet을 함께 전달한다.
    await fetchQueue(page, executedIdSet);
    setExecuting(false);
  };

  // RowLike(메인 추천/대안 후보 행)를 모달에 넘길 TransferExecuteTarget 형태로 변환.
  // 단건/일괄 실행 모두 동일한 필드 매핑을 쓰므로 공통 헬퍼로 묶는다.
  const toExecuteTarget = (row: RowLike, title: string): TransferExecuteTarget => ({
    recommendationId: row.recommendationId,
    title,
    from: row.from,
    to: row.to,
    distance: row.distance,
    score: row.score,
    scoreDetails: row.scoreDetails,
  });

  const requestExecuteRow = (row: RowLike, title: string) => {
    setModal({
      targets: [toExecuteTarget(row, title)],
      onConfirm: () => { void doExecute([row.recommendationId]); },
    });
  };

  const requestExecuteSelected = () => {
    const ids = Array.from(selected);
    const targets: TransferExecuteTarget[] = ids
      .map((id) => items?.find((it) => it.recommendationId === id))
      .filter((it): it is RelocationItem => !!it)
      .map((it) => toExecuteTarget(it, it.title));
    setModal({ targets, onConfirm: () => { void doExecute(ids); } });
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
      {modal && <TransferExecuteModal config={modal} onClose={() => setModal(null)} />}

      <div className="flex flex-col gap-4">
        <SectionHeader
          title="이관 우선순위 목록"
          sub="매칭 스코어 기반 이관 우선순위">
          <button onClick={requestExecuteSelected} disabled={selected.size === 0 || executing}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ backgroundColor: NAV }}>
            {executing ? <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" /> : <Truck className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="hidden sm:inline">일괄 이관 ({selected.size})</span>
            <span className="sm:hidden">이관 ({selected.size})</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded p-0.5 w-fit">
            {(["전체", "발신", "수신"] as const).map((d) => (
              <button key={d} onClick={() => setDirFilter(d)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${dirFilter === d ? "text-white" : "text-muted-foreground hover:bg-muted"}`}
                style={dirFilter === d ? { backgroundColor: NAV } : {}}>
                {/* CURRENT_LIBRARY에는 shortName이 없어(shortAddress만 존재) name으로 대체 — 기존 코드의 사전 존재 버그 수정 */}
                {d === "전체" ? "전체 방향" : `${CURRENT_LIBRARY.name} ${d}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 sm:ml-auto text-[11px] text-muted-foreground whitespace-nowrap flex-wrap">
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
                  <th className="w-9 px-3 sm:px-4 py-2.5">
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
                    <th key={i} className={`px-3 sm:px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${h.hide}`}>{h.label}</th>
                  ))}
                  <th className="px-3 sm:px-4 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">사서 결정</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-3 sm:px-4 py-10 text-center text-sm text-muted-foreground">표시할 이관 후보가 없습니다.</td></tr>
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
                        <td className="px-3 sm:px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} disabled={disabled} onChange={() => toggleSel(item.recommendationId)} className="rounded accent-primary" />
                        </td>
                        <td className="px-3 sm:px-4 py-2.5">
                          <div className="p-1 rounded">
                            {isOpen
                              ? <ChevronUp className="w-4 h-4" style={{ color: NAV }} />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2.5 max-w-[160px] sm:max-w-[200px]">
                          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.genre}</p>
                        </td>
                        <RelocationRowCells row={item} onExecute={(row) => requestExecuteRow(row, item.title)} />
                      </tr>

                      {isOpen && item.alternatives.length === 0 && (
                        <tr className="border-b border-border last:border-0 bg-blue-50/40" style={{ borderLeft: `2px solid ${NAV}` }}>
                          <td colSpan={9} className="px-3 sm:px-4 py-2.5 text-[11px] text-muted-foreground">다른 대안 후보가 없습니다.</td>
                        </tr>
                      )}
                      {isOpen && item.alternatives.map((alt) => (
                        <tr key={`alt-${item.recommendationId}-${alt.recommendationId}`}
                          className="border-b border-border last:border-0 bg-blue-50/40"
                          style={{ borderLeft: `2px solid ${NAV}` }}>
                          <td colSpan={3} className="px-3 sm:px-4 py-2.5"></td>
                          <RelocationRowCells row={alt} onExecute={(row) => requestExecuteRow(row, item.title)} />
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 sm:px-4 py-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* 산출식 설명은 보조 정보라 좁은 화면에서는 숨기고, 필요하면 스코어 바 툴팁으로 확인 */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
              <span className="font-semibold uppercase tracking-wide whitespace-nowrap">매칭 스코어 산출식:</span>
              <span className="truncate">
                M = 거리 감쇄(30%) + 장르 수요도(25%) + 수급 불일치 해소(25%) + 공간 효율성(20%)
              </span>
            </div>
            {pageInfo.totalPages > 1 && (() => {
              const WINDOW = 5;
              const start = Math.floor(page / WINDOW) * WINDOW;
              const end = Math.min(pageInfo.totalPages - 1, start + WINDOW - 1);
              const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

              const navBtnClass =
                "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0";

              return (
                <div className="flex gap-1 overflow-x-auto justify-center sm:justify-end">
                  <button onClick={() => goToPage(0)} disabled={executing || page === 0} className={navBtnClass} aria-label="처음 페이지">
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => goToPage(page - 1)} disabled={executing || page === 0} className={navBtnClass} aria-label="이전 페이지">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {pages.map((p) => (
                    <button key={p} onClick={() => goToPage(p)} disabled={executing}
                      className={`w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 text-sm rounded border font-medium transition-colors disabled:opacity-50
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
          </div>
        </Card>
      </div>
    </>
  );
}