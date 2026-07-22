// 이관 우선순위 큐를 보여주고, 개별/선택/전체 이관 실행을 확인 모달을 통해 처리하는 페이지
import { Fragment, useState } from "react";
import {
  CheckCheck, Truck, ArrowRight, ArrowLeft, Check, Clock, Pin,
  ChevronDown, ChevronUp,
} from "lucide-react";

import { Card, SectionHeader, DemandTag, ScoreStackBar, ConfirmModal, withAlpha } from "../components";
import { NAV, BLUE, GREEN, RED, AMBER } from "../constants/colors";
import { RELOCATION_QUEUE } from "../data";
import { RelocationItem, ModalConfig } from "../types";

function RelocationRowCells({ item, onExecute }: { item: RelocationItem; onExecute: (item: RelocationItem) => void }) {
  const isFrom = item.from === "북수원도서관";
  const isTo = item.to === "북수원도서관";
  const done = item.status === "실행완료";
  return (
    <>
      <td className="px-3 py-2.5 max-w-[160px]">
        <div className="flex items-center gap-1 text-xs whitespace-nowrap">
          <span className={`truncate ${isFrom?"font-semibold":"text-muted-foreground"}`} style={isFrom?{color:NAV}:{}}>
            {isFrom && <Pin className="w-2.5 h-2.5 inline mr-0.5"/>}{item.from}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className={`truncate ${isTo?"font-semibold":"text-muted-foreground"}`} style={isTo?{color:NAV}:{}}>
            {isTo && <Pin className="w-2.5 h-2.5 inline mr-0.5"/>}{item.to}
          </span>
        </div>
      </td>
      <td className="hidden md:table-cell px-3 py-2.5"><DemandTag level={item.genreDemand} /></td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
            <div className="h-full rounded-full" style={{ width:`${item.stockShortage}%`, backgroundColor:item.stockShortage>80?RED:item.stockShortage>60?AMBER:BLUE }} />
          </div>
          <span className="text-xs font-medium text-foreground whitespace-nowrap" style={{ fontFamily:"'JetBrains Mono', monospace" }}>{item.stockShortage}%</span>
        </div>
      </td>
      <td className="hidden lg:table-cell px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap" style={{ fontFamily:"'JetBrains Mono', monospace" }}>{item.distance} km</td>
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
        {done
          ? <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 whitespace-nowrap"><Check className="w-3 h-3 flex-shrink-0"/>완료</span>
          : <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 whitespace-nowrap"><Clock className="w-3 h-3 flex-shrink-0"/>대기</span>}
      </td>
      <td className="px-2 sm:px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
        {!done && (
          <button onClick={()=>onExecute(item)}
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded text-white text-[11px] font-medium ml-auto hover:opacity-80 whitespace-nowrap"
            style={{ backgroundColor:NAV }}>
            <Truck className="w-3 h-3 flex-shrink-0" /><span className="hidden sm:inline">이관 실행</span>
          </button>
        )}
      </td>
    </>
  );
}

export function RelocationPage() {
  const [queue,        setQueue]        = useState<RelocationItem[]>(RELOCATION_QUEUE);
  const [selected,     setSelected]     = useState<Set<number>>(new Set());
  const [executedOut,  setExecutedOut]  = useState(0);
  const [executedIn,   setExecutedIn]   = useState(0);
  const [dirFilter,    setDirFilter]    = useState<"전체"|"발신"|"수신">("전체");
  const [modal,        setModal]        = useState<ModalConfig | null>(null);
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const filtered = queue.filter((q) => dirFilter==="전체" || q.hubDirection===dirFilter);

  const top5ByScore = [...queue].sort((a, b) => b.score - a.score).slice(0, 5);

  const applyExecute = (ranks: number[]) => {
    const executedItems = queue.filter((q) => ranks.includes(q.rank));
    const outCount = executedItems.filter((q) => q.hubDirection === "발신").length;
    const inCount  = executedItems.filter((q) => q.hubDirection === "수신").length;
    setQueue((prev) => prev.map((q) => ranks.includes(q.rank) ? { ...q, status:"실행완료" } : q));
    setExecutedOut((n) => n + outCount);
    setExecutedIn((n) => n + inCount);
    setSelected(new Set());
  };

  const requestExecuteItem = (item: RelocationItem) => {
    setModal({
      title: "이관 실행 확인",
      body: `"${item.title}" 을(를) ${item.from}에서 ${item.to}(으)로 이관하시겠습니까?`,
      detail: `이동 거리 ${item.distance} km · 재고 부족률 ${item.stockShortage}% · 우선순위 점수 ${item.score}점. 이관 실행 후 물리적 운반 일정을 별도로 조율해야 합니다.`,
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

  const requestExecuteAll = () => {
    const pendingItems = queue.filter((q) => q.status === "대기");
    const pendingRanks = pendingItems.map((q) => q.rank);
    const totalDist    = pendingItems.reduce((s, q) => s + q.distance, 0);
    const outCount     = pendingItems.filter((q) => q.hubDirection === "발신").length;
    const inCount      = pendingItems.filter((q) => q.hubDirection === "수신").length;
    setModal({
      title: "전체 이관 실행 확인",
      body: `대기 중인 이관 항목 ${pendingRanks.length}건을 전체 실행하시겠습니까? 아래 실행 요약을 확인 후 결정해 주십시오.`,
      detail: "전체 실행은 현재 대기 상태인 모든 이관 건에 동시 적용됩니다. 각 분관의 수용 가능 여부 및 운반 일정을 사전 조율한 후 실행해 주십시오.",
      confirmLabel: `전체 ${pendingRanks.length}건 실행 확정`,
      confirmColor: BLUE,
      icon: "danger",
      summaryItems: [
        { label: "실행 대상",      value: `${pendingRanks.length}건`,         color: NAV,   sub: "대기 상태 전체" },
        { label: "예상 총 이동",   value: `${totalDist.toFixed(1)} km`,        color: AMBER, sub: "분관 간 합산" },
        { label: "발신 / 수신",    value: `${outCount} / ${inCount}`,          color: BLUE,  sub: "북수원 기준" },
      ],
      onConfirm: () => applyExecute(pendingRanks),
    });
  };

  const toggleSel = (rank: number) => {
    setSelected((prev) => { const n=new Set(prev); n.has(rank)?n.delete(rank):n.add(rank); return n; });
  };
  const pendingFiltered = filtered.filter((q)=>q.status==="대기");
  const allSel = pendingFiltered.length>0 && pendingFiltered.every((q)=>selected.has(q.rank));
  const toggleAll = () => allSel ? setSelected(new Set()) : setSelected(new Set(pendingFiltered.map((q)=>q.rank)));

  return (
    <>
      {modal && <ConfirmModal config={modal} onClose={()=>setModal(null)} />}

      <div className="flex flex-col gap-4">
        <SectionHeader
          title="이관 우선순위 목록"
          sub="수원시 공공도서관 네트워크 — 마모·재고·수요 조건 기반 우선순위 · 행 클릭 시 하단 상세 펼침">
          {selected.size > 0 && (
            <button onClick={requestExecuteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor:NAV }}>
              <Truck className="w-3.5 h-3.5 flex-shrink-0" /> 선택 이관 실행 ({selected.size}건)
            </button>
          )}
          <button onClick={requestExecuteAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white whitespace-nowrap"
            style={{ backgroundColor:BLUE }}>
            <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" /> 전체 이관 실행
          </button>
        </SectionHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            { label:"전체 대기 건수",    value:queue.filter((q)=>q.status==="대기").length,                                    color:NAV,   unit:"건" },
            { label:"이번 달 발신 건수", value:executedOut,                                                                    color:BLUE,  unit:"건" },
            { label:"이번 달 수신 건수", value:executedIn,                                                                     color:GREEN, unit:"건" },
          ].map((s) => (
            <Card key={s.label} className="p-3 flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
              <span className="text-xl font-semibold" style={{ color:s.color, fontFamily:"'JetBrains Mono', monospace" }}>
                {s.value}{s.unit}
              </span>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-card border border-border rounded p-0.5">
            {(["전체","발신","수신"] as const).map((d) => (
              <button key={d} onClick={()=>setDirFilter(d)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${dirFilter===d?"text-white":"text-muted-foreground hover:bg-muted"}`}
                style={dirFilter===d ? { backgroundColor:NAV } : {}}>
                {d==="전체"?"전체 방향":`북수원 ${d}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600"/>실행완료</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"/>대기</span>
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
                    { label: "장르 수요", hide: "hidden md:table-cell" },
                    { label: "재고 부족률", hide: "" },
                    { label: "거리 (km)", hide: "hidden lg:table-cell" },
                    { label: "우선순위 점수 ↕", hide: "" },
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
                  const done  = item.status==="실행완료";
                  const isSel = selected.has(item.rank);
                  const isOpen = expandedRank === item.rank;
                  return (
                    <Fragment key={item.rank}>
                      <tr
                        onClick={() => setExpandedRank(isOpen ? null : item.rank)}
                        className={`border-b border-border last:border-0 transition-colors cursor-pointer
                        ${isOpen?"bg-blue-50":isSel?"bg-blue-50":"hover:bg-muted/30"} ${done?"opacity-50":""}`}
                        style={isOpen ? { borderLeft:`2px solid ${NAV}`, borderBottom:"none" } : {}}>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} disabled={done} onChange={()=>toggleSel(item.rank)} className="rounded accent-primary" />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="p-1 rounded">
                            {isOpen
                              ? <ChevronUp className="w-4 h-4" style={{ color:NAV }} />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.genre}</p>
                        </td>
                        <RelocationRowCells item={item} onExecute={requestExecuteItem} />
                      </tr>

                      {isOpen && top5ByScore.map((t) => (
                        <tr key={`sub-${item.rank}-${t.rank}`}
                          className="border-b border-border last:border-0 bg-blue-50/40"
                          style={{ borderLeft:`2px solid ${NAV}` }}>
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
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">우선순위 산출식:</span>
            <span className="text-[11px] text-muted-foreground">
              점수 = 장르 수요(40%) + 재고 부족률(35%) − 거리 패널티(25%)
            </span>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">
              기준점: <span className="font-medium text-foreground">북수원도서관 (장안구)</span>
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length}건 표시</span>
          </div>
        </Card>
      </div>
    </>
  );
}
