// 이관 우선순위 큐를 보여주고, 개별/선택 이관 실행을 확인 모달을 통해 처리하는 페이지
import { Fragment, useState, useEffect } from "react";
import {
  Truck, ArrowRight, ArrowLeft, Check, Clock, Pin, Ban,
  ChevronDown, ChevronUp, Loader2,
} from "lucide-react";

import { Card, SectionHeader, ScoreStackBar, ConfirmModal, withAlpha } from "../components";
import { NAV, BLUE, GREEN, RED, AMBER } from "../constants/colors";
import { fetchRelocationQueue } from "../api/relocationQueue";
import { RelocationItem, ModalConfig } from "../types";

import { CURRENT_LIBRARY } from "../constants/library";

function RelocationRowCells({ item, onExecute }: { item: RelocationItem; onExecute: (item: RelocationItem) => void }) {
  const isFrom = item.from === CURRENT_LIBRARY.name;
  const isTo = item.to === CURRENT_LIBRARY.name;
  const done = item.status === "실행완료";
  const closed = item.status === "종료";
  // 같은 Top5 후보 중 다른 항목이 먼저 이관 실행되어 매칭이 종료된 상태
  const disabled = done || closed;
  return (
    <>
      <td className="px-3 py-2.5 max-w-[160px]">
        <div className="flex items-center gap-1 text-xs whitespace-nowrap">
          <span className={`truncate ${isFrom ? "font-semibold" : "text-muted-foreground"}`} style={isFrom ? { color: NAV } : {}}>
            {isFrom && <Pin className="w-2.5 h-2.5 inline mr-0.5" />}{item.from}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className={`truncate ${isTo ? "font-semibold" : "text-muted-foreground"}`} style={isTo ? { color: NAV } : {}}>
            {isTo && <Pin className="w-2.5 h-2.5 inline mr-0.5" />}{item.to}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
            <div className="h-full rounded-full" style={{ width: `${item.stockShortage}%`, backgroundColor: item.stockShortage > 80 ? RED : item.stockShortage > 60 ? AMBER : BLUE }} />
          </div>
          <span className="text-xs font-medium text-foreground whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.stockShortage}%</span>
        </div>
      </td>
      <td className="hidden lg:table-cell px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.distance} km</td>
      <td className="px-3 py-2.5"><ScoreStackBar item={item} /></td>
      <td className="hidden xl:table-cell px-3 py-2.5">
        {item.hubDirection === "발신" ? (
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
        {done && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 whitespace-nowrap"><Check className="w-3 h-3 flex-shrink-0" />완료</span>
        )}
        {closed && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 whitespace-nowrap"><Ban className="w-3 h-3 flex-shrink-0" />마감</span>
        )}
        {!done && !closed && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 whitespace-nowrap"><Clock className="w-3 h-3 flex-shrink-0" />대기</span>
        )}
      </td>
      <td className="px-2 sm:px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        {!disabled && (
          <button onClick={() => onExecute(item)}
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
  const [queue, setQueue] = useState<RelocationItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [executedOut, setExecutedOut] = useState(0);
  const [executedIn, setExecutedIn] = useState(0);
  const [dirFilter, setDirFilter] = useState<"전체" | "발신" | "수신">("전체");
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  // TODO: API 연동 완료 후 실제 갱신 주기/재조회 트리거(폴링, 실행 후 refetch 등) 정책 결정 필요
  useEffect(() => {
    let cancelled = false;
    fetchRelocationQueue()
      .then((data) => { if (!cancelled) setQueue(data); })
      .catch((err) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : "데이터 로딩 실패"); });
    return () => { cancelled = true; };
  }, []);

  if (loadError) {
    return <Card className="p-6 text-sm" style={{ color: RED }}>이관 후보 데이터를 불러오지 못했습니다: {loadError}</Card>;
  }
  if (!queue) {
    return (
      <Card className="p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> 이관 후보 데이터를 불러오는 중...
      </Card>
    );
  }

  const filtered = queue.filter((q) => dirFilter === "전체" || q.hubDirection === dirFilter);

  const top5ByScore = [...queue].sort((a, b) => b.score - a.score).slice(0, 5);

  const applyExecute = (ranks: number[]) => {
    const executedItems = queue.filter((q) => ranks.includes(q.rank));
    const outCount = executedItems.filter((q) => q.hubDirection === "발신").length;
    const inCount = executedItems.filter((q) => q.hubDirection === "수신").length;

    // 실행된 항목이 Top5 매칭 후보에 포함되어 있다면, 같은 Top5 안의 나머지 "대기" 항목들은 이미 다른 도서관으로 매칭이 종료된 것으로 간주해 "종료" 상태로 전환한다.
    // (실제 API 연동 시에는 이 판정/전환을 서버가 내려주는 응답으로 대체해야 함 — API 명세서 참고)
    const executedInTop5 = ranks.some((r) => top5ByScore.some((t) => t.rank === r));
    const top5Ranks = new Set(top5ByScore.map((t) => t.rank));

    setQueue((prev) => prev!.map((q) => {
      if (ranks.includes(q.rank)) return { ...q, status: "실행완료" };
      if (executedInTop5 && top5Ranks.has(q.rank) && q.status === "대기") {
        return { ...q, status: "종료" };
      }
      return q;
    }));
    setExecutedOut((n) => n + outCount);
    setExecutedIn((n) => n + inCount);
    setSelected(new Set());
  };

  const requestExecuteItem = (item: RelocationItem) => {
    setModal({
      title: "이관 실행 확인",
      body: `"${item.title}" 을(를) ${item.from}에서 ${item.to}(으)로 이관하시겠습니까?`,
      detail: `이동 거리 ${item.distance} km · 매칭 스코어 ${item.score}점. 이관 실행 후 물리적 운반 일정을 별도로 조율해야 합니다.`,
      confirmLabel: "이관 실행",
      confirmColor: NAV,
      icon: "warning",
      onConfirm: () => applyExecute([item.rank]),
    });
  };

  const requestExecuteSelected = () => {
    const ranks = Array.from(selected);
    setModal({
      title: "선택 이관 실행 확인",
      body: `선택한 도서 ${ranks.length}건을 일괄 이관 처리하시겠습니까?`,
      detail: "이관 처리 후 각 분관 담당자에게 운반 일정 안내가 필요합니다. 실행 전 물리적 이동 가능 여부를 반드시 확인하십시오.",
      confirmLabel: `${ranks.length}건 이관 실행`,
      confirmColor: NAV,
      icon: "warning",
      onConfirm: () => applyExecute(ranks),
    });
  };

  const toggleSel = (rank: number) => {
    setSelected((prev) => { const n = new Set(prev); n.has(rank) ? n.delete(rank) : n.add(rank); return n; });
  };
  const pendingFiltered = filtered.filter((q) => q.status === "대기");
  const allSel = pendingFiltered.length > 0 && pendingFiltered.every((q) => selected.has(q.rank));
  const toggleAll = () => allSel ? setSelected(new Set()) : setSelected(new Set(pendingFiltered.map((q) => q.rank)));

  return (
    <>
      {modal && <ConfirmModal config={modal} onClose={() => setModal(null)} />}

      <div className="flex flex-col gap-4">
        <SectionHeader
          title="이관 우선순위 목록"
          sub="수원시 공공도서관 네트워크 — 하드필터 통과 도서 대상 매칭 스코어 기반 우선순위 · 행 클릭 시 하단 상세 펼침">
          <button onClick={requestExecuteSelected} disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ backgroundColor: NAV }}>
            <Truck className="w-3.5 h-3.5 flex-shrink-0" /> 일괄 이관 ({selected.size})
          </button>
        </SectionHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { label: "전체 대기 건수", value: queue.filter((q) => q.status === "대기").length, color: NAV, unit: "건" },
            { label: "이번 달 발신 건수", value: executedOut, color: BLUE, unit: "건" },
            { label: "이번 달 수신 건수", value: executedIn, color: GREEN, unit: "건" },
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
                {d === "전체" ? "전체 방향" : `${CURRENT_LIBRARY.shortName} ${d}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600" />실행완료</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />대기</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />종료</span>
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
                    { label: "재고 부족률", hide: "" },
                    { label: "거리 (km)", hide: "hidden lg:table-cell" },
                    { label: "매칭 스코어 ↕", hide: "" },
                    { label: "방향", hide: "hidden xl:table-cell" },
                    { label: "상태", hide: "" },
                  ].map((h, i) => (
                    <th key={i} className={`px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${h.hide}`}>{h.label}</th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">사서 결정</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const done = item.status === "실행완료";
                  const closed = item.status === "종료";
                  const disabled = done || closed;
                  const isSel = selected.has(item.rank);
                  const isOpen = expandedRank === item.rank;
                  // Top5 상세 목록: 현재 펼친 항목과 동일한 후보(중복)는 제외하고 상위 4건만 노출
                  const top4Others = top5ByScore.filter((t) => t.rank !== item.rank).slice(0, 4);
                  return (
                    <Fragment key={item.rank}>
                      <tr
                        onClick={() => setExpandedRank(isOpen ? null : item.rank)}
                        className={`border-b border-border last:border-0 transition-colors cursor-pointer
                        ${isOpen ? "bg-blue-50" : isSel ? "bg-blue-50" : "hover:bg-muted/30"} ${disabled ? "opacity-50" : ""}`}
                        style={isOpen ? { borderLeft: `2px solid ${NAV}`, borderBottom: "none" } : {}}>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} disabled={disabled} onChange={() => toggleSel(item.rank)} className="rounded accent-primary" />
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
                        <RelocationRowCells item={item} onExecute={requestExecuteItem} />
                      </tr>

                      {isOpen && top4Others.map((t) => (
                        <tr key={`sub-${item.rank}-${t.rank}`}
                          className="border-b border-border last:border-0 bg-blue-50/40"
                          style={{ borderLeft: `2px solid ${NAV}` }}>
                          <td colSpan={3} className="px-3 py-2.5"></td>
                          <RelocationRowCells item={t} onExecute={requestExecuteItem} />
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
            <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length}건 표시</span>
          </div>
        </Card>
      </div>
    </>
  );
}