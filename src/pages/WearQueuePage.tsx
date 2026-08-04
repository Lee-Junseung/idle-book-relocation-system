// 유휴화 점수 산정 도서 중 점검 리스트가 등록되지 않은 도서 목록을 보여주고, 점검 리스트 등록을 시작하는 페이지
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardList, CalendarClock, Search, RefreshCw,
  ChevronUp, ChevronDown, ListFilter, Tag,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from "lucide-react";
import { Card, SectionHeader, InspectionChecklistModal } from "../components";
import { NAV } from "../constants/colors";
import { IdleScoreBar } from "../components/IdleScoreBar";
import { Book, DamageInspection } from "../types";
import type { ChecklistErrorState, ChecklistSortOrder } from "../types/checklists";
import { averageScore, clampToScore } from "../constants/checklistItems";
import {
  getChecklistListApi,
  mapToBook,
  registerChecklistApi,
  buildChecklistRegisterRequest,
  classifyIdleBooksApi,
} from "../api/checklists";
import { ApiError } from "../api/client";

const PAGE_SIZE = 10;

// 검색/장르/정렬 변경 시 재조회를 얼마나 늦출지 (타이핑마다 요청이 나가지 않도록)
const FILTER_DEBOUNCE_MS = 400;

// GET /api/checklists의 genre 파라미터는 자유 텍스트가 아니라 KDC 대분류 값을 그대로 받으므로,
// (전체 목록이 아니라) 현재 페이지에 실린 도서에서만 뽑던 기존 방식 대신 KDC 10개 대분류를 고정 목록으로 사용한다.
const KDC_GENRES = [
  "총류", "철학", "종교", "사회과학", "자연과학",
  "기술과학", "예술", "언어", "문학", "역사",
];

export function WearQueuePage({
  books, setBooks, inspections, setInspections, inspectorName, librarianCode,
}: {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  inspections: Record<string, DamageInspection>;
  setInspections: React.Dispatch<React.SetStateAction<Record<string, DamageInspection>>>;
  inspectorName?: string;
  librarianCode: string; // 로그인 세션의 사서 코드 — 점검 리스트 등록 요청(librarianCode)에 사용
}) {
  const [checklistTarget, setChecklistTarget] = useState<Book | null>(null);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("전체 장르");
  // 백엔드가 유휴화 점수(idleScore) 정렬만 지원하므로(ASC/DESC), 제목/장르 정렬은 지원하지 않는다.
  const [sortOrder, setSortOrder] = useState<ChecklistSortOrder | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages: 1, totalElements: 0 });

  // OverviewPage와 동일한 형태: 최초 진입 시에만 전체 로딩 화면을 보여주고, 이후 페이지 이동/새로고침은 refreshing 표시만으로 처리한다.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ChecklistErrorState | null>(null);
  const [saveError, setSaveError] = useState<ChecklistErrorState | null>(null);

  // 도서 리스트 조회 (GET /api/checklists?status=DAMAGE_PENDING&keyword=&genre=&sortOrder=&page=&size=)
  // 서버가 "해당 지점 + 점검 미등록(DAMAGE_PENDING)" 조건을 이미 필터링해서 내려주므로 프론트에서 branch/inspection 상태를 다시 거를 필요 없음.
  // 검색(keyword)/장르(genre)/정렬(sortOrder)도 서버로 그대로 전달해서 전체 데이터 기준으로 처리한다 —
  // 클라이언트에서 다시 거르면 현재 페이지(10건) 안에서만 동작하는 문제가 생기기 때문.
  const fetchQueueBooks = useCallback(async (targetPage = 0) => {
    setError(null);
    try {
      const json = await getChecklistListApi("DAMAGE_PENDING", targetPage, PAGE_SIZE, {
        keyword: search.trim() || undefined,
        genre: genreFilter === "전체 장르" ? undefined : genreFilter,
        sortOrder: sortOrder ?? undefined,
      });
      setBooks(json.data.map(mapToBook));
      setPageInfo({ totalPages: json.pageInfo.totalPages, totalElements: json.pageInfo.totalElements });
      setPage(json.pageInfo.currentPage);
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ message: e.message, errorType: e.error, statusCode: e.statusCode });
      } else {
        setError({ message: e instanceof Error ? e.message : "도서 목록 조회 중 오류가 발생했습니다." });
      }
    } finally {
      setLoading(false);
    }
  }, [setBooks, search, genreFilter, sortOrder]);

  // 최초 진입 시 1회 조회
  useEffect(() => { fetchQueueBooks(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색어 / 장르 / 정렬이 바뀌면 1페이지부터 다시 조회 (검색은 타이핑 중 매 요청을 막기 위해 디바운스)
  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) { isFirstFilterRun.current = false; return; }
    const timer = setTimeout(() => { fetchQueueBooks(0); }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, genreFilter, sortOrder]);

  // 유휴화 도서 새로고침 (POST /api/checklists/idle-classify → 목록 재조회)
  // idle-classify로 서버 측 재산정을 먼저 수행한 뒤, 갱신된 결과를 1페이지부터 다시 불러온다.
  // idle-classify 자체가 실패하면 목록 조회는 하지 않고 바로 에러를 표시한다.
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      await classifyIdleBooksApi();
      await fetchQueueBooks(0);
    } catch (e) {
      if (e instanceof ApiError) {
        setError({ message: e.message, errorType: e.error, statusCode: e.statusCode });
      } else {
        setError({ message: e instanceof Error ? e.message : "유휴화 도서 재산정 중 오류가 발생했습니다." });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const goToPage = (p: number) => {
    if (p === page) return;
    fetchQueueBooks(p);
  };

  // 서버가 이미 지점+상태+검색어+장르+정렬까지 전부 반영해서 내려주므로 화면에는 books를 그대로 사용
  const queueBooks = books;
  const genres = ["전체 장르", ...KDC_GENRES];

  // 유휴화 점수 정렬만 지원 (제목/장르 정렬은 백엔드가 지원하지 않아 제거)
  const toggleIdleScoreSort = () => {
    setSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"));
  };

  const IdleScoreSortIcon = () =>
    sortOrder === null
      ? <ChevronDown className="w-3.5 h-3.5 opacity-25" />
      : sortOrder === "DESC"
        ? <ChevronDown className="w-3.5 h-3.5 text-primary" />
        : <ChevronUp className="w-3.5 h-3.5 text-primary" />;

  // 점검 리스트 등록 (POST /api/checklists/results)
  const handleChecklistSave = async (insp: DamageInspection) => {
    if (!checklistTarget) return;

    // 로그인 응답에 librarianCode가 내려오지 않아 세션에 값이 없을 수 있음(App.tsx/types/index.ts 참고).
    // 빈 값으로 등록 요청을 보내면 백엔드에서 어느 사서가 점검했는지 알 수 없으므로 여기서 미리 막는다.
    if (!librarianCode) {
      setSaveError({ message: "사서 정보를 확인할 수 없습니다. 다시 로그인한 후 시도해 주세요." });
      return;
    }

    const targetId = checklistTarget.id;
    setSaving(true);
    setSaveError(null);
    try {
      const body = buildChecklistRegisterRequest(targetId, insp, librarianCode);
      await registerChecklistApi(body);

      setInspections((prev) => ({ ...prev, [targetId]: insp }));
      // 화면에 표시하는 damage dot(1~5)은 15개 항목 평균 기준 — 백엔드 totalScore(15개 합)와는 별개 계산
      const avgRounded = clampToScore(averageScore(insp));
      setBooks((prev) => prev.map((b) => b.id === targetId ? { ...b, damage: avgRounded } : b));
      setChecklistTarget(null);

      // 서버 재조회 전까지 방금 등록한 도서를 화면에서 바로 빼주기 위해 목록 새로고침
      fetchQueueBooks(page);
    } catch (e) {
      if (e instanceof ApiError) {
        setSaveError({ message: e.message, errorType: e.error, statusCode: e.statusCode });
      } else {
        setSaveError({ message: e instanceof Error ? e.message : "점검 리스트 등록 중 오류가 발생했습니다." });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 sm:p-6 text-sm text-muted-foreground">데이터를 불러오는 중입니다...</div>;
  }

  return (
    <>
      {checklistTarget && (
        <InspectionChecklistModal
          book={checklistTarget}
          initial={inspections[checklistTarget.id]}
          inspectorDefault={inspectorName}
          onClose={() => { setChecklistTarget(null); setSaveError(null); }}
          onSave={handleChecklistSave}
        />
      )}

      <div className="flex flex-col gap-4">
        <SectionHeader
          title="마모 점검 대상 목록"
          sub={`점검 리스트 미등록 도서 자동 추출`}>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white disabled:opacity-60 whitespace-nowrap"
            style={{ backgroundColor: NAV }}>
            <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "새로고침 중…" : "유휴화 도서 새로고침"}
          </button>
        </SectionHeader>

        {error && (
          <div className="px-4 py-3 rounded-md border border-red-200 bg-red-50 flex items-start gap-2.5 text-sm text-red-500">
            {error.errorType && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 flex-shrink-0 whitespace-nowrap">
                {error.statusCode ?? ""} {error.errorType}
              </span>
            )}
            <span>{error.message}</span>
          </div>
        )}

        {saveError && (
          <div className="px-4 py-3 rounded-md border border-red-200 bg-red-50 flex items-start gap-2.5 text-sm text-red-500">
            {saveError.errorType && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 flex-shrink-0 whitespace-nowrap">
                {saveError.statusCode ?? ""} {saveError.errorType}
              </span>
            )}
            <span>점검 리스트 등록 실패: {saveError.message}</span>
          </div>
        )}

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
                className="w-48 pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
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
          <span className="ml-auto text-sm text-muted-foreground self-center whitespace-nowrap">{queueBooks.length} / {pageInfo.totalElements}건</span>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    제목 / 저자
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    장르
                  </th>
                  <th onClick={toggleIdleScoreSort}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap cursor-pointer select-none">
                    <span className="flex items-center gap-1">유휴화 점수<IdleScoreSortIcon /></span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">점검 리스트</th>
                </tr>
              </thead>
              <tbody>
                {queueBooks.map((book) => (
                  <tr key={book.id} className="border-b border-border hover:bg-muted/25 transition-colors">
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="text-sm font-medium text-foreground truncate">{book.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground max-w-[110px] truncate">{book.genre}</td>
                    <td className="px-4 py-3">
                      <IdleScoreBar book={book} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setSaveError(null); setChecklistTarget(book); }} disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-medium hover:opacity-85 active:scale-95 transition-transform whitespace-nowrap disabled:opacity-50"
                        style={{ backgroundColor: NAV }}>
                        <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" /> 점검 등록
                      </button>
                    </td>
                  </tr>
                ))}
                {queueBooks.length === 0 && (
                  <tr><td colSpan={4} className="py-16 text-center text-sm text-muted-foreground">
                    <CalendarClock className="w-5 h-5 mx-auto mb-2 opacity-40" />
                    {search === "" && genreFilter === "전체 장르"
                      ? "현재 점검이 필요한 도서가 없습니다. 모든 대상 도서의 점검 리스트가 등록되었습니다."
                      : "검색 조건에 해당하는 도서가 없습니다."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">유휴화 점수 = (KDC별 정보 노후도 가중치 X 정보 노후도 점수) + (KDC별 대출 저조도 가중치 X 대출 저조도 점수)</span>
            {pageInfo.totalPages > 1 && (() => {
              const WINDOW = 5;
              const half = Math.floor(WINDOW / 2);
              let start = Math.max(0, page - half);
              let end = Math.min(pageInfo.totalPages - 1, start + WINDOW - 1);
              start = Math.max(0, end - WINDOW + 1);
              const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

              const navBtnClass =
                "w-8 h-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors";

              return (
                <div className="flex gap-1">
                  <button onClick={() => goToPage(0)} disabled={page === 0} className={navBtnClass} aria-label="처음 페이지">
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => goToPage(page - 1)} disabled={page === 0} className={navBtnClass} aria-label="이전 페이지">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {pages.map((p) => (
                    <button key={p} onClick={() => goToPage(p)}
                      className={`w-8 h-8 text-sm rounded border font-medium transition-colors
            ${p === page ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      {p + 1}
                    </button>
                  ))}

                  <button onClick={() => goToPage(page + 1)} disabled={page === pageInfo.totalPages - 1} className={navBtnClass} aria-label="다음 페이지">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => goToPage(pageInfo.totalPages - 1)} disabled={page === pageInfo.totalPages - 1} className={navBtnClass} aria-label="끝 페이지">
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
