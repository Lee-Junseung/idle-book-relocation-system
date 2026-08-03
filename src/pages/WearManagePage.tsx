// 점검 리스트 등록이 완료된 도서를 필터/정렬하고, 폐기·이관·보존을 결정 확정하는 페이지
// mock ↔ 실제 API 전환은 .env.local의 VITE_USE_MOCK 값으로 자동 처리
// api/checklistApi.ts 내부에서 분기하므로 이 파일의 import를 직접 바꿀 필요는 없습니다.
// - "전체 점검 이력 보기" 버튼으로 이력(4번)이 화면에 노출되어 있습니다.
// - 폐기/이관/보존 "결정" 확정(6번)은 프론트 설계안(백엔드 확정 전)입니다.
//   성공한 건만 로컬 상태(applyAction)에도 반영합니다.
//   ⚠️ 동일 목적의 기존 백엔드 API가 확인되면 api/checklistApi.ts의
//      confirmDecisionReal 쪽 URL/바디를 그것으로 교체해야 합니다.
// - 목록 API가 genre/isbn/turnoverRate는 내려주지만(nullable) branch(지점)는 내려주지
//   않아 branch만 이 페이지 지점명으로 임시 고정합니다.
//   (src/types/checklistApi.ts의 mapCompletedItemToBook 참고)
// - 백엔드에 전역 예외 핸들러가 없어 없는 리소스 조회 시 500(비JSON)이 내려올
//   수 있어, 프론트에서 이를 감지해 우호적인 메시지로 표시합니다.
import * as checklistApi from "../api/checklistApi";

import { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Trash2, MoveRight, BookMarked,
  ChevronUp, ChevronDown, Check, Clock, ListFilter,
  X, Search, ClipboardEdit, Tag, Loader2, AlertTriangle, History,
} from "lucide-react";

import { Card, SectionHeader, DamageDot, DamageTooltipCell, ConfirmModal, InspectionChecklistModal, withAlpha, getDotColor, getDotLabel } from "../components";
import { NAV, GREEN, RED, PURPLE, AMBER } from "../constants/colors";
import { BOOK_LOAN_HISTORY, BOOK_DAMAGE_REASON } from "../constants/bookDemoData";
import { INSP_ITEMS_FLAT, averageScore, clampToScore } from "../constants/checklistItems";
import { buildMonthlyLoanData } from "../components/lib";
import { Book, BookStatus, DamageInspection, ModalConfig } from "../types";
import {
  ChecklistApiError,
  BookDetailResult,
  ChecklistHistoryEntry,
  mapCompletedItemToBook,
  UpdateCheckResultInput,
  bookStatusToDecision,
  CheckItemMaster,
} from "../types/checklistApi";

import { CURRENT_LIBRARY } from "../constants/library";

const STATUS_META: Record<
  Exclude<BookStatus, "대기">,
  { label: string; verb: string; color: string; icon: "danger" | "warning" }
> = {
  폐기승인: { label: "폐기", verb: "폐기 처리", color: RED, icon: "danger" },
  이관승인: { label: "이관", verb: "이관 처리", color: PURPLE, icon: "warning" },
  보존결정: { label: "보존", verb: "보존 처리", color: "#4A4335", icon: "warning" },
};

export function WearManagePage({
  books, setBooks, inspections, setInspections, inspectorName, librarianCode,
}: {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  inspections: Record<string, DamageInspection>;
  setInspections: React.Dispatch<React.SetStateAction<Record<string, DamageInspection>>>;
  inspectorName?: string;
  // PUT /checklists/results/{resultBatchId} 요청에 실리는 사서 식별 코드 (세션의 librarianId).
  // 화면에 표시되는 자유입력 "점검자명"(inspectorName/inspector)과는 별개 값입니다.
  librarianCode?: string;
}) {
  const branchFilter = CURRENT_LIBRARY.name;
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

  // --- API 연동: 목록 조회 ---------------------------------------------
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  // bookId -> resultBatchId (상세 수정 PUT 호출 시 필요)
  const [resultBatchByBookId, setResultBatchByBookId] = useState<Record<string, number>>({});

  const loadCompletedList = () => {
    setListLoading(true);
    setListError(null);
    checklistApi
      .getCompletedChecklists()
      .then((items) => {
        const mapped = items.map((item) => mapCompletedItemToBook(item, branchFilter));
        setBooks(mapped);
        setResultBatchByBookId(
          Object.fromEntries(items.map((item) => [String(item.bookId), item.resultBatchId]))
        );
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ChecklistApiError ? err.message : "점검 완료 도서 목록을 불러오지 못했습니다.";
        setListError(message);
      })
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    loadCompletedList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- API 연동: 점검 항목 마스터 조회 (checkItemId -> maxScore 등) ------
  // 화면 내부 척도(1~5)를 실제 항목별 만점(maxScore)에 맞춰 변환할 때 사용합니다.
  // 실패해도 화면 자체는 계속 쓸 수 있어야 하므로, 실패 시 조용히 폴백(만점 5로 간주)합니다.
  const [checkItemMaster, setCheckItemMaster] = useState<Record<number, CheckItemMaster>>({});

  useEffect(() => {
    checklistApi
      .getCheckItems()
      .then((items) => setCheckItemMaster(Object.fromEntries(items.map((item) => [item.id, item]))))
      .catch((err: unknown) => {
        console.warn(
          "[WearManagePage] 점검 항목 마스터 조회 실패 — 항목별 만점을 5점으로 간주해 계속 진행합니다.",
          err
        );
      });
  }, []);

  // --- API 연동: 상세 조회 (행 패널을 펼칠 때) ---------------------------
  const [bookDetail, setBookDetail] = useState<BookDetailResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!panelBook) {
      setBookDetail(null);
      setDetailError(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    checklistApi
      .getBookDetail(Number(panelBook.id))
      .then((detail) => setBookDetail(detail))
      .catch((err: unknown) => {
        const message =
          err instanceof ChecklistApiError ? err.message : "점검 상세 정보를 불러오지 못했습니다.";
        setDetailError(message);
        setBookDetail(null);
      })
      .finally(() => setDetailLoading(false));
  }, [panelBook]);

  // --- API 연동: 전체 점검 이력 (4번, 버튼 클릭 시 조회) -----------------
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<ChecklistHistoryEntry[]>([]);

  useEffect(() => {
    // 도서(패널) 전환 시 이력 패널은 접힌 상태로 초기화
    setHistoryOpen(false);
    setHistoryError(null);
    setHistoryEntries([]);
  }, [panelBook]);

  const toggleHistory = (bookId: string) => {
    if (historyOpen) { setHistoryOpen(false); return; }
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    checklistApi
      .getBookHistory(Number(bookId))
      .then((entries) => setHistoryEntries(entries))
      .catch((err: unknown) => {
        const message =
          err instanceof ChecklistApiError ? err.message : "점검 이력을 불러오지 못했습니다.";
        setHistoryError(message);
        setHistoryEntries([]);
      })
      .finally(() => setHistoryLoading(false));
  };

  const inspectedBooks = books.filter((b) => !!inspections[b.id] || !!resultBatchByBookId[b.id]);

  const filtered = useMemo(() => {
    let list = books.filter((b) =>
      b.branch === branchFilter &&
      (!!inspections[b.id] || !!resultBatchByBookId[b.id]) &&
      (genreFilter === "전체 장르" || b.genre === genreFilter) &&
      b.damage >= damageMin &&
      (search === "" || b.title.includes(search) || b.isbn.includes(search) || b.id.includes(search))
    );
    return [...list].sort((a, b2) => {
      const av = a[sortKey] as string | number, bv = b2[sortKey] as string | number;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [books, inspections, resultBatchByBookId, branchFilter, genreFilter, damageMin, search, sortKey, sortDir]);

  const applyAction = (ids: string[], status: BookStatus) =>
    setBooks((prev) => prev.map((b) => ids.includes(b.id) ? { ...b, status } : b));

  // --- API 연동: 폐기/이관/보존 결정 확정 (실제 서버 저장) --------------
  const [decisionSaving, setDecisionSaving] = useState(false);

  // resultBatchId가 있는 도서만 서버에 저장 요청을 보내고, 없는 도서는
  // 건너뛴 뒤 실패로 안내합니다 (목록 새로고침이 필요한 상태일 수 있음).
  const confirmDecisionForBooks = async (ids: string[], status: Exclude<BookStatus, "대기">) => {
    if (!librarianCode) {
      setModal({
        title: "처리 실패",
        body: "사서 정보를 확인할 수 없습니다. 다시 로그인한 후 시도해 주세요.",
        confirmLabel: "확인",
        confirmColor: RED,
        icon: "danger",
        onConfirm: () => { },
      });
      return;
    }

    const decision = bookStatusToDecision(status);
    const decidedDate = new Date().toISOString().slice(0, 10);
    const targets = ids.filter((id) => resultBatchByBookId[id] !== undefined);
    const skipped = ids.filter((id) => resultBatchByBookId[id] === undefined);

    setDecisionSaving(true);
    const results = await Promise.allSettled(
      targets.map((id) =>
        checklistApi.confirmDecision(resultBatchByBookId[id], { decision, librarianCode, decidedDate })
      )
    );
    setDecisionSaving(false);

    const succeededIds = targets.filter((_, i) => results[i].status === "fulfilled");
    const failedCount = targets.length - succeededIds.length + skipped.length;

    // 서버 저장에 성공한 건만 화면 상태에도 반영합니다.
    if (succeededIds.length > 0) applyAction(succeededIds, status);

    if (failedCount > 0) {
      const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      const message =
        firstError?.reason instanceof ChecklistApiError
          ? firstError.reason.message
          : "일부 도서의 처리 결정 저장에 실패했습니다.";
      setModal({
        title: succeededIds.length > 0 ? "일부 처리 실패" : "처리 실패",
        body: succeededIds.length > 0
          ? `${succeededIds.length}건 저장 완료, ${failedCount}건 저장 실패했습니다. (${message})`
          : message,
        confirmLabel: "확인",
        confirmColor: RED,
        icon: "danger",
        onConfirm: () => { },
      });
    }
  };

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
      onConfirm: () => { void confirmDecisionForBooks([book.id], status); },
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
      onConfirm: () => { void confirmDecisionForBooks(ids, status); setSelected(new Set()); },
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

  const [saving, setSaving] = useState(false);

  const handleChecklistSave = async (insp: DamageInspection) => {
    if (!checklistTarget) return;
    const targetId = checklistTarget.id;

    // 화면(로컬) 상태는 기존과 동일하게 즉시 반영합니다.
    setInspections((prev) => ({ ...prev, [targetId]: insp }));
    const avgRounded = clampToScore(averageScore(insp));
    setBooks((prev) => prev.map((b) => b.id === targetId ? { ...b, damage: avgRounded } : b));

    // --- API 연동: 점검 결과 수정 (PUT) --------------------------------
    // INSP_ITEMS_FLAT의 각 항목이 checkItemId를 갖고 있으므로 그대로 매핑합니다.
    const resultBatchId = resultBatchByBookId[targetId];
    // ⚠️ isPassed 판정 기준(몇 점 이하를 "통과"로 볼지)은 아직 정책이 확정되지
    // 않아 1점(양호)만 통과로 임시 처리합니다 — 기준 확정되면 교체 필요.
    // 화면 내부 척도는 1~5점 고정이지만, 항목별 실제 만점(maxScore)은
    // GET /checklists/check-items(마스터 조회)로 받아온 값을 사용해 변환합니다.
    // 마스터 조회가 실패했거나 해당 항목이 없으면 만점 5(=화면 척도와 동일)로 간주합니다.
    const checkResults: UpdateCheckResultInput[] = INSP_ITEMS_FLAT.map(({ key, checkItemId }) => {
      const value = insp[key] as unknown as number;
      const maxScore = checkItemMaster[checkItemId]?.maxScore ?? 5;
      const itemScore = Math.round((value / 5) * maxScore);
      return {
        checkItemId,
        isPassed: value <= 1,
        itemScore,
      };
    });
    // 백엔드 totalScore는 15개 항목 itemScore의 합으로 봅니다 (constants/checklistItems.ts의
    // averageScore 주석 참고). 화면 표시용 1~5 마모도(avgRounded)와는 별개 값입니다.
    const totalScoreForApi = checkResults.reduce((sum, r) => sum + r.itemScore, 0);

    if (!resultBatchId) {
      console.warn(
        `[WearManagePage] "${targetId}" 도서의 resultBatchId를 찾을 수 없어 서버 저장을 건너뜁니다. ` +
        "(점검 완료 목록 응답에 해당 도서가 없거나 새로고침이 필요할 수 있습니다)"
      );
      setChecklistTarget(null);
      return;
    }

    // WearQueuePage와 동일하게, 사서 식별 코드가 없으면 "누가 수정했는지" 알 수 없는 상태로
    // 서버에 저장 요청을 보내지 않도록 사전에 막습니다.
    if (!librarianCode) {
      setModal({
        title: "저장 실패",
        body: "사서 정보를 확인할 수 없습니다. 다시 로그인한 후 시도해 주세요.",
        confirmLabel: "확인",
        confirmColor: RED,
        icon: "danger",
        onConfirm: () => { },
      });
      setChecklistTarget(null);
      return;
    }

    setSaving(true);
    try {
      await checklistApi.updateChecklistResult(resultBatchId, {
        bookId: Number(targetId),
        librarianCode,
        checkedDate: insp.date,
        totalScore: totalScoreForApi,
        checkResults,
      });
      // 상세 패널이 같은 도서를 보고 있다면 최신 상태로 갱신
      if (panelBook?.id === targetId) {
        const detail = await checklistApi.getBookDetail(Number(targetId));
        setBookDetail(detail);
      }
    } catch (err: unknown) {
      const message =
        err instanceof ChecklistApiError ? err.message : "점검 결과 저장 중 오류가 발생했습니다.";
      setModal({
        title: "저장 실패",
        body: message,
        confirmLabel: "확인",
        confirmColor: RED,
        icon: "danger",
        onConfirm: () => { },
      });
    } finally {
      setSaving(false);
      setChecklistTarget(null);
    }
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

        {listError && (
          <Card className="p-4 flex items-center gap-2 border" style={{ borderColor: withAlpha(RED, 0.3), backgroundColor: withAlpha(RED, 0.05) }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: RED }} />
            <span className="text-sm text-foreground flex-1">{listError}</span>
            <button onClick={loadCompletedList} className="text-sm font-medium underline" style={{ color: RED }}>
              다시 시도
            </button>
          </Card>
        )}

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
              <input type="text" placeholder="제목 / ISBN…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-50 pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background w-44 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground font-medium">장르</label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}
                className="appearance-none pl-8 pr-8 py-2 text-sm rounded-md border border-border bg-background shadow-sm hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors cursor-pointer">
                {genres.map((g) => <option key={g}>{g}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
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
          {listLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> 점검 완료 도서 목록을 불러오는 중…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    <th className="w-9 px-4 py-3">
                      <input type="checkbox" checked={allSel} onChange={toggleAll} className="rounded accent-primary" />
                    </th>
                    {([
                      { key: "title", label: "제목 / 저자", hide: "" },
                      { key: "genre", label: "장르", hide: "hidden md:table-cell" },
                      { key: "damage", label: "마모 수준", hide: "" },
                      { key: "turnover", label: "연 대출률", hide: "hidden xl:table-cell" },
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

                                    {/* API(3번, 상세 조회) 기반 렌더링 — 로딩/에러/데이터 순으로 표시 */}
                                    {detailLoading ? (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> 점검 상세 불러오는 중…
                                      </div>
                                    ) : detailError ? (
                                      <p className="text-sm pt-2 border-t border-border" style={{ color: RED }}>{detailError}</p>
                                    ) : bookDetail ? (
                                      <div className="flex flex-col gap-1.5 pt-2 border-t border-border max-h-40 overflow-y-auto pr-1">
                                        {bookDetail.checkResults.map((r) => (
                                          <div key={r.checkItemId} className="flex items-center justify-between gap-2">
                                            <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                                              {r.title}{r.note ? ` · ${r.note}` : ""}
                                            </span>
                                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: r.isPassed ? GREEN : RED }}>
                                              {r.isPassed ? "이상없음" : `감점 ${r.itemScore}`}
                                            </span>
                                          </div>
                                        ))}
                                        <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-border">
                                          <span className="text-xs text-muted-foreground truncate">
                                            담당 {bookDetail.librarianCode} · <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{bookDetail.checkedDate}</span>
                                          </span>
                                          <span className="text-xs font-bold flex-shrink-0 ml-1" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>
                                            총점 {bookDetail.totalScore}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic pt-2 border-t border-border">세부 심사 데이터 없음</p>
                                    )}

                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleHistory(book.id); }}
                                      className="flex items-center gap-1 text-xs font-medium mt-3 pt-2 border-t border-border transition-colors hover:opacity-70"
                                      style={{ color: NAV }}>
                                      <History className="w-3.5 h-3.5" />
                                      {historyOpen ? "전체 이력 접기" : "전체 점검 이력 보기"}
                                      {historyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    {historyOpen && (
                                      <div className="mt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                                        {historyLoading ? (
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> 이력 불러오는 중…
                                          </div>
                                        ) : historyError ? (
                                          <p className="text-xs" style={{ color: RED }}>{historyError}</p>
                                        ) : historyEntries.length === 0 ? (
                                          <p className="text-xs text-muted-foreground italic">이전 점검 이력이 없습니다.</p>
                                        ) : (
                                          historyEntries.map((entry) => {
                                            const failCount = entry.items.filter((i) => !i.isPassed).length;
                                            return (
                                              <div key={entry.resultBatchId}
                                                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-border bg-muted/20">
                                                <div className="flex flex-col min-w-0">
                                                  <span className="text-xs text-foreground font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                                    {entry.checkedDate}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground truncate">
                                                    담당 {entry.librarianCode} · 이상항목 {failCount}건
                                                  </span>
                                                </div>
                                                <span className="text-xs font-bold flex-shrink-0" style={{ color: NAV, fontFamily: "'JetBrains Mono', monospace" }}>
                                                  {entry.totalScore}점
                                                </span>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
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
          )}
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filtered.length}건 표시 중{(saving || decisionSaving) ? " · 저장 중…" : ""}
            </span>
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