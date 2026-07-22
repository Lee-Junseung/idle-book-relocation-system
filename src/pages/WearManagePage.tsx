// 점검 리스트 등록이 완료된 도서를 필터/정렬하고, 폐기·이관·보존을 결정 확정하는 페이지
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Trash2, MoveRight, BookMarked,
  ChevronUp, ChevronDown, Check, Clock, ListFilter,
  X, Search, ClipboardEdit,
} from "lucide-react";

import { Card, SectionHeader, DamageDot, DamageTooltipCell, ConfirmModal, InspectionChecklistModal, withAlpha, getDotColor, getDotLabel } from "../components";
import { NAV, GREEN, RED, PURPLE, AMBER } from "../constants/colors";
import { BOOK_LOAN_HISTORY, BOOK_DAMAGE_REASON } from "../data/bookDetails";
import { INSP_ITEMS_FLAT, averageScore } from "../data/damageInspections";
import { buildMonthlyLoanData } from "../data/wearUtils";
import { clampToScore } from "../data/seed";
import { Book, BookStatus, DamageInspection, ModalConfig } from "../types";

const STATUS_META: Record<
  Exclude<BookStatus, "대기">,
  { label: string; verb: string; color: string; icon: "danger" | "warning" }
> = {
  폐기승인: { label: "폐기", verb: "폐기 처리", color: RED, icon: "danger" },
  이관승인: { label: "이관", verb: "이관 처리", color: PURPLE, icon: "warning" },
  보존결정: { label: "보존", verb: "보존 처리", color: "#4A4335", icon: "warning" },
};

export function WearManagePage({
  books, setBooks, inspections, setInspections, inspectorName,
}: {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  inspections: Record<string, DamageInspection>;
  setInspections: React.Dispatch<React.SetStateAction<Record<string, DamageInspection>>>;
  inspectorName?: string;
}) {
  const branchFilter = "북수원도서관";
  const genres = ["전체 장르", ...Array.from(new Set(books.map((b) => b.genre)))];

  const [genreFilter, setGenreFilter] = useState("전체 장르");
  const [damageMin, setDamageMin] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<keyof Book>("damage");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [panelBook, setPanelBook] = useState<Book | null>(null);
  const [checklistTarget, setChecklistTarget] = useState<Book | null>(null);

  const inspectedBooks = books.filter((b) => !!inspections[b.id]);

  const filtered = useMemo(() => {
    let list = books.filter((b) =>
      b.branch === branchFilter &&
      !!inspections[b.id] &&
      (genreFilter === "전체 장르" || b.genre === genreFilter) &&
      b.damage >= damageMin &&
      (search === "" || b.title.includes(search) || b.isbn.includes(search) || b.id.includes(search))
    );
    return [...list].sort((a, b2) => {
      const av = a[sortKey] as string | number, bv = b2[sortKey] as string | number;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [books, inspections, branchFilter, genreFilter, damageMin, search, sortKey, sortDir]);

  const applyAction = (ids: string[], status: BookStatus) =>
    setBooks((prev) => prev.map((b) => ids.includes(b.id) ? { ...b, status } : b));

  const requestAction = (book: Book, status: Exclude<BookStatus, "대기">) => {
    const meta = STATUS_META[status];
    setModal({
      title: `정말 ${meta.verb}하시겠습니까?`,
      body: `"${book.title}"에 대해 ${meta.verb}를 진행합니다. 아래 정보를 최종 확인해 주십시오.`,
      confirmLabel: `${meta.label} 확정`,
      confirmColor: meta.color,
      icon: meta.icon,
      bookInfo: {
        title: book.title, author: book.author, id: book.id,
        lastLoan: book.lastLoan, damage: book.damage,
        turnover: book.turnover, branch: book.branch,
      },
      onConfirm: () => applyAction([book.id], status),
    });
  };

  const requestBulkAction = (status: Exclude<BookStatus, "대기">) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const meta = STATUS_META[status];
    setModal({
      title: `일괄 ${meta.label} 처리 확인`,
      body: `선택한 도서 ${ids.length}건을 일괄 ${meta.verb}하시겠습니까?`,
      detail: "일괄 처리는 선택된 모든 도서에 동시 적용됩니다. 각 도서의 마모 조건이 처리 기준을 충족하는지 사전에 검토해 주십시오.",
      confirmLabel: `${ids.length}건 ${meta.label} 확정`,
      confirmColor: meta.color,
      icon: meta.icon,
      onConfirm: () => { applyAction(ids, status); setSelected(new Set()); },
    });
  };

  const toggleSel = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const allSel = filtered.length > 0 && filtered.every((b) => selected.has(b.id));
  const toggleAll = () => allSel ? setSelected(new Set()) : setSelected(new Set(filtered.map((b) => b.id)));

  const toggleSort = (k: keyof Book) => {
    if (sortKey === k) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };
  const SortIcon = ({ k }: { k: keyof Book }) =>
    sortKey === k
      ? (sortDir === "desc" ? <ChevronDown className="w-3.5 h-3.5 text-primary" /> : <ChevronUp className="w-3.5 h-3.5 text-primary" />)
      : <ChevronDown className="w-3.5 h-3.5 opacity-25" />;

  const stats = {
    total: filtered.length,
    pending: inspectedBooks.filter((b) => b.status === "대기").length,
    disposal: inspectedBooks.filter((b) => b.status === "폐기승인").length,
    relocation: inspectedBooks.filter((b) => b.status === "이관승인").length,
    keep: inspectedBooks.filter((b) => b.status === "보존결정").length,
  };

  const handleChecklistSave = (insp: DamageInspection) => {
    if (!checklistTarget) return;
    const targetId = checklistTarget.id;
    setInspections((prev) => ({ ...prev, [targetId]: insp }));
    const avgRounded = clampToScore(averageScore(insp));
    setBooks((prev) => prev.map((b) => b.id === targetId ? { ...b, damage: avgRounded } : b));
    setChecklistTarget(null);
  };

  return (
    <>
      {modal && <ConfirmModal config={modal} onClose={() => setModal(null)} />}
      {checklistTarget && (
        <InspectionChecklistModal
          book={checklistTarget}
          initial={inspections[checklistTarget.id]}
          inspectorDefault={inspectorName}
          onClose={() => setChecklistTarget(null)}
          onSave={handleChecklistSave}
        />
      )}

      <div className="flex flex-col gap-4">
        <SectionHeader
          title="마모 처리 현황 목록"
          sub={`점검 리스트 등록 완료 도서 · 행 클릭 시 하단 상세 펼침`}>
          <button onClick={() => requestBulkAction("폐기승인")} disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ backgroundColor: RED }}>
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> 일괄 폐기 ({selected.size})
          </button>
          <button onClick={() => requestBulkAction("이관승인")} disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ backgroundColor: PURPLE }}>
            <MoveRight className="w-3.5 h-3.5 flex-shrink-0" /> 일괄 이관 ({selected.size})
          </button>
          <button onClick={() => requestBulkAction("보존결정")} disabled={selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ backgroundColor: GREEN }}>
            <Check className="w-3.5 h-3.5 flex-shrink-0" /> 일괄 보존 ({selected.size})
          </button>
        </SectionHeader>

        <div className="flex flex-wrap gap-2">
          {[
            { label: "필터 결과", count: stats.total, color: "#6B7280" },
            { label: "미결정 대기", count: stats.pending, color: AMBER },
            { label: "폐기 승인", count: stats.disposal, color: RED },
            { label: "이관 승인", count: stats.relocation, color: PURPLE },
            { label: "보존 결정", count: stats.keep, color: GREEN },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap"
              style={{ borderColor: withAlpha(s.color, 0.25), backgroundColor: withAlpha(s.color, 0.06), color: s.color }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.count}</span> {s.label}
            </span>
          ))}
        </div>

        <Card className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground self-center">
            <ListFilter className="w-4 h-4" /> 필터
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground font-medium">검색</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="제목 / ISBN / ID…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background w-44 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground font-medium">장르</label>
            <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40">
              {genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              최소 마모 수준: <span className="font-semibold" style={{ color: getDotColor(damageMin), fontFamily: "'JetBrains Mono', monospace" }}>{damageMin}/5 {getDotLabel(damageMin)}</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">1</span>
              <div className="relative flex-1 h-2.5 flex items-center">
                <div className="absolute inset-0 my-auto h-1.5 rounded-full" style={{ backgroundColor: withAlpha(getDotColor(damageMin), 0.13) }} />
                <div className="absolute left-0 my-auto h-1.5 rounded-full transition-all" style={{ width: `${((damageMin - 1) / 4) * 100}%`, backgroundColor: getDotColor(damageMin) }} />
                <input type="range" min={1} max={5} value={damageMin}
                  onChange={(e) => setDamageMin(Number(e.target.value))}
                  className="themed-range relative w-full h-full"
                  style={{ color: getDotColor(damageMin) }} />
              </div>
              <span className="text-xs text-muted-foreground">5</span>
            </div>
          </div>
          <span className="ml-auto text-sm text-muted-foreground self-center">{filtered.length} / {inspectedBooks.length}건</span>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="w-9 px-4 py-3">
                    <input type="checkbox" checked={allSel} onChange={toggleAll} className="rounded accent-primary" />
                  </th>
                  {([
                    { key: "title",    label: "제목 / 저자", hide: "" },
                    { key: "genre",    label: "장르",         hide: "hidden md:table-cell" },
                    { key: "damage",   label: "마모 수준",   hide: "" },
                    { key: "turnover", label: "연 대출률",   hide: "hidden xl:table-cell" },
                  ] as { key: keyof Book; label: string; hide: string }[]).map(({ key, label, hide }) => (
                    <th key={key} onClick={() => toggleSort(key)}
                      className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${hide}`}>
                      <span className="flex items-center gap-1 whitespace-nowrap">{label}<SortIcon k={key} /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">처리 상태</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">분류 확정일</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">사서 결정</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((book) => {
                  const isSel = selected.has(book.id);
                  const done = book.status !== "대기";
                  const isActive = panelBook?.id === book.id;
                  const bAnnualHistory = BOOK_LOAN_HISTORY[book.id]
                    ?? Array.from({ length: 10 }, (_, i) => ({ year: String(2015 + i), v: 1 }));
                  const bMonthlyData = buildMonthlyLoanData(book, bAnnualHistory);
                  const bReason = BOOK_DAMAGE_REASON[book.id] ?? `최근 대출률 ${book.turnover.toFixed(1)}회/년 · 마모 수준 ${book.damage}/5`;
                  const bInsp = inspections[book.id];

                  return (
                    <>
                      <tr key={`row-${book.id}`}
                        onClick={() => setPanelBook(isActive ? null : book)}
                        className={`border-b transition-colors cursor-pointer
                            ${isActive ? "" : "border-border"}
                            ${isActive ? "bg-blue-50" : ""}
                            ${!isActive && isSel ? "bg-slate-50" : ""}
                            ${!isActive && !isSel ? "hover:bg-muted/25" : ""}
                            ${done ? "opacity-70" : ""}`}
                        style={isActive ? { borderBottom: "none", borderLeft: `2px solid ${NAV}` } : {}}>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSel(book.id)} className="rounded accent-primary" />
                        </td>
                        <td className="px-4 py-3 max-w-[230px]">
                          <p className="text-sm font-medium text-foreground truncate">{book.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground max-w-[100px] truncate">{book.genre}</td>
                        <td className="px-4 py-3"><DamageTooltipCell book={book} /></td>
                        <td className="hidden xl:table-cell px-4 py-3 text-sm text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{book.turnover.toFixed(1)}/yr</td>
                        <td className="px-4 py-3">
                          {book.status === "대기" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium text-muted-foreground border-border bg-muted/40 whitespace-nowrap">
                              <Clock className="w-3 h-3 flex-shrink-0" /> 미결정
                            </span>
                          ) : book.status === "폐기승인" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: RED }}>
                              <Trash2 className="w-3 h-3 flex-shrink-0" /> 폐기 승인
                            </span>
                          ) : book.status === "이관승인" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: PURPLE }}>
                              <MoveRight className="w-3 h-3 flex-shrink-0" /> 이관 승인
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: "#4A4335" }}>
                              <BookMarked className="w-3 h-3 flex-shrink-0" /> 보존 결정
                            </span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {book.status === "대기" ? <span className="text-muted-foreground/30">—</span> : "2026-07-17"}
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button disabled={book.status === "폐기승인"} onClick={() => requestAction(book, "폐기승인")}
                              className="flex items-center gap-1 px-2 py-1.5 rounded text-white text-xs font-medium hover:opacity-80 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap"
                              style={{ backgroundColor: RED }}><Trash2 className="w-3.5 h-3.5 flex-shrink-0" /><span className="hidden sm:inline">폐기</span></button>
                            <button disabled={book.status === "이관승인"} onClick={() => requestAction(book, "이관승인")}
                              className="flex items-center gap-1 px-2 py-1.5 rounded text-white text-xs font-medium hover:opacity-80 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap"
                              style={{ backgroundColor: PURPLE }}><MoveRight className="w-3.5 h-3.5 flex-shrink-0" /><span className="hidden sm:inline">이관</span></button>
                            <button disabled={book.status === "보존결정"} onClick={() => requestAction(book, "보존결정")}
                              className="flex items-center gap-1 px-2 py-1.5 rounded text-white text-xs font-medium hover:opacity-80 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap"
                              style={{ backgroundColor: "#4A4335" }}><BookMarked className="w-3.5 h-3.5 flex-shrink-0" /><span className="hidden sm:inline">보존</span></button>
                          </div>
                        </td>
                      </tr>

                      {isActive && (
                        <tr key={`panel-${book.id}`} style={{ borderLeft: `2px solid ${NAV}` }}>
                          <td colSpan={8} className="px-0 pb-0">
                            <div className="px-4 py-4 border-b border-border" style={{ backgroundColor: withAlpha(NAV, 0.02) }}>
                              <div className="flex items-center justify-between mb-3 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: NAV }} />
                                  <p className="text-sm font-semibold text-foreground truncate">{book.title}</p>
                                  <span className="text-sm text-muted-foreground truncate">— {book.author}</span>
                                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded border border-border bg-card flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{book.id}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setPanelBook(null); }}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors flex-shrink-0">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-card rounded-md border border-border p-3 flex flex-col">
                                  <p className="text-sm font-semibold text-foreground mb-2">최근 12개월 월별 대출 추이</p>
                                  <div className="h-48 sm:h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={bMonthlyData} margin={{ top: 4, right: 4, bottom: 2, left: -8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                                        <XAxis dataKey="month"
                                          tick={{ fontSize: 10, fill: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace" }}
                                          axisLine={false} tickLine={false} />
                                        <YAxis
                                          tick={{ fontSize: 10, fill: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace" }}
                                          axisLine={false} tickLine={false}
                                          domain={[0, "dataMax + 1"]} allowDecimals={false} />
                                        <Tooltip
                                          formatter={(v: number) => [`${v}건`, "월간 대출"]}
                                          labelFormatter={(l) => l}
                                          contentStyle={{ fontSize: 11, borderRadius: 4, border: "1px solid #E5E7EB", padding: "2px 8px" }}
                                        />
                                        <Line type="monotone" dataKey="v" stroke={NAV} strokeWidth={2}
                                          dot={{ r: 3, fill: NAV, strokeWidth: 1.5, stroke: "#fff" }}
                                          activeDot={{ r: 4.5, fill: NAV, strokeWidth: 0 }} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>

                                <div className="bg-card rounded-md border border-border p-3 flex flex-col">
                                  <div className="flex items-center justify-between mb-2 gap-2">
                                    <p className="text-sm font-semibold text-foreground">마모 판단 근거</p>
                                    <button onClick={(e) => { e.stopPropagation(); setChecklistTarget(book); }}
                                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border transition-colors hover:bg-muted/40"
                                      style={{ borderColor: withAlpha(NAV, 0.25), color: NAV }}>
                                      <ClipboardEdit className="w-3.5 h-3.5" /> 점검리스트 수정
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <DamageDot level={book.damage} />
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{bReason}</p>

                                  {bInsp ? (
                                    <div className="flex flex-col gap-1.5 pt-2 border-t border-border max-h-40 overflow-y-auto pr-1">
                                      {INSP_ITEMS_FLAT.map(({ key, label }) => {
                                        const val = bInsp[key];
                                        return (
                                          <div key={key} className="flex items-center justify-between gap-2">
                                            <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{label}</span>
                                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: getDotColor(val) }}>{val}/5</span>
                                          </div>
                                        );
                                      })}
                                      <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-border">
                                        <span className="text-xs text-muted-foreground truncate">
                                          15문항 평균 · {bInsp.inspector} · <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{bInsp.date}</span>
                                        </span>
                                        <span className="text-xs font-bold flex-shrink-0 ml-1" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>
                                          {averageScore(bInsp).toFixed(2)} / 5.00
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic pt-2 border-t border-border">세부 심사 데이터 없음</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-16 text-center text-sm text-muted-foreground">조건에 해당하는 도서가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{filtered.length}건 표시 중</span>
            <div className="flex gap-1">
              {[1, 2, 3, "…", 6].map((p, i) => (
                <button key={i} className={`w-8 h-8 text-sm rounded border font-medium transition-colors
                  ${p === 1 ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:bg-muted"}`}>{p}</button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}