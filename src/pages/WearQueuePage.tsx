// 유휴화 점수 산정 도서 중 점검 리스트가 등록되지 않은 도서 목록을 보여주고, 점검 리스트 등록을 시작하는 페이지
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClipboardList, CalendarClock, Search, RefreshCw,
  ChevronUp, ChevronDown, ListFilter, Tag, Loader2,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
} from "lucide-react";
import { Card, SectionHeader, InspectionChecklistModal } from "../components";
import { NAV } from "../constants/colors";
import { KDC_GENRES } from "../constants/genres";
import { IdleScoreBar } from "../components/IdleScoreBar";
import { Book, DamageInspection } from "../types";
import type { ChecklistErrorState, ChecklistListResponse, ChecklistSortOrder } from "../types/checklists";
import { averageScore, clampToScore } from "../constants/checklistItems";
import {
  getChecklistListApi,
  mapToBook,
  registerChecklistApi,
  buildChecklistRegisterRequest,
  classifyIdleBooksApi,
} from "../api/checklists";
import { ApiError } from "../api/client";
import type { PageId } from "../types";

const PAGE_SIZE = 10;

// 검색(타이핑)에만 적용하는 디바운스. 장르/정렬은 클릭 한 번으로 값이 바로 확정되는 액션이라
// 굳이 기다릴 필요가 없어서 별도로 분리하고 즉시 조회한다 (예전엔 셋 다 400ms를 기다렸음).
const SEARCH_DEBOUNCE_MS = 300;

// 조회 결과 캐시. 컴포넌트 바깥(모듈 스코프)에 둬서 WearManagePage 등 다른 화면에 갔다가
// 다시 돌아와도 유지된다. 페이지/검색어/장르/정렬 조합을 키로 마지막 응답을 저장해두고,
// 같은 조합을 다시 조회할 때는 네트워크 응답을 기다리지 않고 캐시를 먼저 화면에 보여준 뒤
// (stale-while-revalidate) 최신 데이터가 도착하면 조용히 교체한다.
// "유휴화 도서 새로고침"을 누르면 실제 데이터가 바뀌므로 전체 무효화한다.
const queueListCache = new Map<string, ChecklistListResponse>();
const buildQueueCacheKey = (
  targetPage: number,
  keyword: string,
  genre: string,
  sortOrder: ChecklistSortOrder | null
) => `${targetPage}|${keyword}|${genre}|${sortOrder ?? ""}`;

export function WearQueuePage({
  books, setBooks, inspections, setInspections, inspectorName, librarianCode, setActivePage,
}: {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  inspections: Record<string, DamageInspection>;
  setInspections: React.Dispatch<React.SetStateAction<Record<string, DamageInspection>>>;
  inspectorName?: string;
  librarianCode: string; // 로그인 세션의 사서 코드 — 점검 리스트 등록 요청(librarianCode)에 사용
  // 등록 성공 시 WearManagePage("wear-manage")로 이동시키기 위함.
  // 아래 페이지네이션용 로컬 상태(page/setPage)와 이름이 겹치지 않도록 setActivePage로 명명.
  setActivePage: React.Dispatch<React.SetStateAction<PageId>>;
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

  // 최초 진입 시에만 전체 화면 로딩을 보여주고, 이후 페이지 이동/필터/검색은
  // tableLoading(테이블 위 오버레이)만으로 표시해서 화면이 완전히 비지 않게 한다.
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<ChecklistErrorState | null>(null);
  const [saveError, setSaveError] = useState<ChecklistErrorState | null>(null);

  // 진행 중인 조회 요청 추적용. 새 요청(페이지 이동/필터 변경 등)이 시작되면 이전 요청은 취소해서,
  // 느린 이전 응답이 나중에 도착해 최신 화면을 덮어써버리는 경쟁 상태(예: 페이지 버튼 빠르게 연타)를 막는다.
  const abortRef = useRef<AbortController | null>(null);

  // 도서 리스트 조회 (GET /api/checklists?status=DAMAGE_PENDING&keyword=&genre=&sortOrder=&page=&size=)
  // 서버가 "해당 지점 + 점검 미등록(DAMAGE_PENDING)" 조건을 이미 필터링해서 내려주므로 프론트에서 branch/inspection 상태를 다시 거를 필요 없음.
  // 검색(keyword)/장르(genre)/정렬(sortOrder)도 서버로 그대로 전달해서 전체 데이터 기준으로 처리한다 —
  // 클라이언트에서 다시 거르면 현재 페이지(10건) 안에서만 동작하는 문제가 생기기 때문.
  const fetchQueueBooks = useCallback(async (targetPage = 0) => {
    setError(null);
    const keyword = search.trim();
    const genre = genreFilter === "전체 장르" ? "" : genreFilter;
    const cacheKey = buildQueueCacheKey(targetPage, keyword, genre, sortOrder);
    const cached = queueListCache.get(cacheKey);

    // 캐시가 있으면 네트워크 응답을 기다리지 않고 먼저 화면에 반영한다 (stale-while-revalidate).
    // 아래에서 실제 최신 응답이 오면 다시 한 번 덮어써서 항상 최신 상태로 맞춘다.
    if (cached) {
      setBooks(cached.data.map(mapToBook));
      setPageInfo({ totalPages: cached.pageInfo.totalPages, totalElements: cached.pageInfo.totalElements });
      setPage(cached.pageInfo.currentPage);
      setLoading(false);
    } else {
      setTableLoading(true);
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const json = await getChecklistListApi("DAMAGE_PENDING", targetPage, PAGE_SIZE, {
        keyword: keyword || undefined,
        genre: genre || undefined,
        sortOrder: sortOrder ?? undefined,
      }, controller.signal);

      queueListCache.set(cacheKey, json);
      setBooks(json.data.map(mapToBook));
      setPageInfo({ totalPages: json.pageInfo.totalPages, totalElements: json.pageInfo.totalElements });
      setPage(json.pageInfo.currentPage);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // 취소된 요청 — 더 최신 요청이 대신 처리 중이므로 무시
      if (e instanceof ApiError) {
        setError({ message: e.message, errorType: e.error, statusCode: e.statusCode });
      } else {
        setError({ message: e instanceof Error ? e.message : "도서 목록 조회 중 오류가 발생했습니다." });
      }
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [setBooks, search, genreFilter, sortOrder]);

  // 최초 진입 시 1회 조회
  useEffect(() => { fetchQueueBooks(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색어가 바뀌면 1페이지부터 다시 조회 (타이핑 중 매 요청이 나가지 않도록 디바운스)
  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) { isFirstSearchRun.current = false; return; }
    const timer = setTimeout(() => { fetchQueueBooks(0); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // 장르/정렬은 클릭 한 번으로 값이 바로 확정되는 액션이므로 디바운스 없이 즉시 1페이지부터 재조회
  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) { isFirstFilterRun.current = false; return; }
    fetchQueueBooks(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreFilter, sortOrder]);

  // 유휴화 도서 새로고침 (POST /api/checklists/idle-classify → 목록 재조회)
  // idle-classify로 서버 측 재산정을 먼저 수행한 뒤, 갱신된 결과를 1페이지부터 다시 불러온다.
  // idle-classify 자체가 실패하면 목록 조회는 하지 않고 바로 에러를 표시한다.
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      await classifyIdleBooksApi();
      queueListCache.clear(); // 재산정으로 실제 데이터가 바뀌므로 이전에 캐시해둔 응답은 더 이상 유효하지 않음
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
    if (saving) return; // 이미 저장 중이면 중복 호출 무시

    // 로그인 응답에 librarianCode가 내려오지 않아 세션에 값이 없을 수 있음(App.tsx/types/index.ts 참고).
    // 빈 값으로 등록 요청을 보내면 백엔드에서 어느 사서가 점검했는지 알 수 없으므로 여기서 미리 막는다.
    if (!librarianCode) {
      setSaveError({ message: "사서 정보를 확인할 수 없습니다. 다시 로그인한 후 시도해 주세요." });
      return;
    }

    const targetId = checklistTarget.id;
    if (checklistTarget.resultId === undefined) {
      setSaveError({ message: "점검 대상 정보가 올바르지 않습니다. 목록을 새로고침한 후 다시 시도해 주세요." });
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const body = buildChecklistRegisterRequest(checklistTarget.resultId, insp, librarianCode);
      await registerChecklistApi(body);

      setInspections((prev) => ({ ...prev, [targetId]: insp }));
      // 화면에 표시하는 damage dot(1~5)은 15개 항목 평균 기준 — 백엔드 totalScore(15개 합)와는 별개 계산
      const avgRounded = clampToScore(averageScore(insp));
      setBooks((prev) => prev.map((b) => b.id === targetId ? { ...b, damage: avgRounded } : b));
      setChecklistTarget(null);

      // 방금 등록한 도서가 이제 DAMAGE_PENDING 목록에서 빠지므로, 캐시해둔 이전 목록 응답은 더 이상 정확하지 않다.
      // 이 화면으로 다시 돌아왔을 때 등록된 도서가 캐시 때문에 다시 보이지 않도록 비워준다.
      queueListCache.clear();

      // 점검 등록이 끝난 도서는 이 화면(DAMAGE_PENDING 목록) 대상이 아니므로 더 이상 여기 머무를 필요가 없다.
      // WearManagePage로 이동시킨다 — 그쪽에서 마운트 시 GET /checklists/results/completed로 최신 목록을 다시 받아온다.
      // (여기서 fetchQueueBooks로 재조회하면 등록 직후 화면에는 남아있는 채로 재클릭이 가능해져
      //  "이미 등록된 점검 결과입니다" 에러로 이어지는 원인이 되므로 재조회 대신 즉시 페이지 전환한다.)
      setActivePage("wear-manage");
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
          saving={saving}
          onClose={() => { setChecklistTarget(null); setSaveError(null); }}
          onSave={handleChecklistSave}
        />
      )}

      <div className="flex flex-col gap-4">
        <SectionHeader
          title="유휴 도서 점검 목록"
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

        <Card className="overflow-hidden relative">
          {tableLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
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
          <div className="px-4 py-3 border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide whitespace-nowrap">
                유휴화 점수 산출식:
              </span>
              <span>
                U-Score = (KDC별 정보 노후도 가중치 × 정보 노후도) + (KDC별 대출 저조도 가중치 × 대출 저조도)
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
