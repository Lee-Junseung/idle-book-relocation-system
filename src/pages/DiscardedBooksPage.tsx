// 폐기 확정 도서 목록 + 도서관법 시행령 [별표 7] 제3호(연간 폐기 상한: 전체 장서의 100분의 7) 준수 현황 페이지
import { useEffect, useMemo, useState } from "react";
import { Trash2, Search, Loader2, AlertTriangle, Gauge, ShieldAlert, ShieldCheck, Archive, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

import { Card, SectionHeader, MetricCard, withAlpha } from "../components";
import { NAV, RED, AMBER, GREEN, BLUE } from "../constants/colors";
import { KDC_GENRES } from "../constants/genres";
import { getDiscardedBooksApi } from "../api/discardedBooks";
import { ApiError } from "../api/client";
import { DiscardedBookItem, DiscardQuota } from "../types/discardedBooks";

// 백엔드 ChecklistService#convertKdcToGenre / TransferService#convertKdcToGenre와 동일한 규칙(KDC 대분류 첫 자리 -> 장르명)
function kdcClassToGenre(kdcClass: string | null): string {
  if (!kdcClass) return "기타";
  const idx = Number(kdcClass[0]);
  return Number.isInteger(idx) && idx >= 0 && idx < KDC_GENRES.length ? KDC_GENRES[idx] : "기타";
}

// 상한 대비 진행률에 따라 안내 색상을 3단계로 나눔 (여유 / 주의 / 상한 도달)
function quotaTone(quota: DiscardQuota): { color: string; label: string } {
  if (quota.capReached) return { color: RED, label: "상한 도달" };
  const ratio = quota.capCount > 0 ? quota.discardedCount / quota.capCount : 0;
  if (ratio >= 0.85) return { color: AMBER, label: "상한 임박" };
  return { color: GREEN, label: "여유" };
}

const PAGE_SIZE = 10;

export function DiscardedBooksPage() {
  const [books, setBooks] = useState<DiscardedBookItem[]>([]);
  const [quota, setQuota] = useState<DiscardQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const load = () => {
    setLoading(true);
    setError(null);
    getDiscardedBooksApi()
      .then((data) => {
        setBooks(data.books);
        setQuota(data.quota);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError ? err.message : "폐기 도서 목록을 불러오지 못했습니다.";
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      books.filter(
        (b) =>
          search === "" ||
          b.title.includes(search) ||
          b.isbn.includes(search) ||
          b.author.includes(search)
      ),
    [books, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [search]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  const goToPage = (p: number) => {
    setPage(p);
  };

  const paginated = useMemo(
    () => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filtered, page]
  );

  const tone = quota ? quotaTone(quota) : null;
  const progressPct = quota && quota.capCount > 0
    ? Math.min(100, Math.round((quota.discardedCount / quota.capCount) * 1000) / 10)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="폐기 처리 도서 목록"
        sub="연간 폐기 상한 준수 현황"
      />

      {error && (
        <Card className="p-4 flex items-center gap-2 border" style={{ borderColor: withAlpha(RED, 0.3), backgroundColor: withAlpha(RED, 0.05) }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: RED }} />
          <span className="text-sm text-foreground flex-1">{error}</span>
          <button onClick={load} className="text-sm font-medium underline" style={{ color: RED }}>
            다시 시도
          </button>
        </Card>
      )}

      {quota && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <MetricCard
              label="소장 도서 수"
              value={quota.totalBooks.toLocaleString()}
              sub="총 소장 권수"
              color={NAV}
              icon={Archive}
            />
            <MetricCard
              label="연간 폐기 가능 한도"
              value={quota.capCount.toLocaleString()}
              sub={`전체 장서 대비 최대 ${Math.round(quota.capRatio * 100)}%`}
              color={BLUE}
              icon={Gauge}
            />
            <MetricCard
              label="금년 폐기 확정"
              value={quota.discardedCount.toLocaleString()}
              sub={`연간 한도 ${quota.capCount.toLocaleString()}권 대비`}
              color={tone!.color}
              icon={Trash2}
            />
            <MetricCard
              label="잔여 폐기 가능 수량"
              value={quota.remaining.toLocaleString()}
              sub={
                quota.capReached
                  ? "금년 폐기 한도 도달"
                  : tone!.label === "상한 임박"
                    ? "상한 임박 · 서버 자동 검증"
                    : "서버 자동 검증"
              }
              color={tone!.color}
              icon={quota.capReached || tone!.label === "상한 임박" ? ShieldAlert : ShieldCheck}
            />
          </div>

        </>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="제목 / ISBN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background w-56 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <span className="text-sm text-muted-foreground">{filtered.length} / {books.length}건</span>
          </div>

          {quota && (
            <div className="ml-auto w-full sm:w-auto sm:min-w-[280px] max-w-xs flex flex-col gap-1.5 pl-4 border-l border-border">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">상한 대비 처리 현황</span>
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: tone!.color, fontFamily: "'JetBrains Mono', monospace" }}>
                  {quota.discardedCount.toLocaleString()}/{quota.capCount.toLocaleString()} ({progressPct}%) · {tone!.label}
                </span>
              </div>
              <div className="h-2 rounded-full w-full overflow-hidden" style={{ backgroundColor: withAlpha(tone!.color, 0.13) }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, backgroundColor: tone!.color }}
                />
              </div>
              {quota.capReached && (
                <p className="text-xs mt-0.5" style={{ color: RED }}>
                  연간 폐기 상한 도달로 신규 폐기 확정이 서버에서 거부됩니다. 초과가 필요하면 운영위원회 심의가 필요합니다 (시행령 [별표 7] 제3호 단서).
                </p>
              )}
              {!quota.capReached && tone!.label === "상한 임박" && (
                <p className="text-xs mt-0.5" style={{ color: AMBER }}>
                  연간 폐기 상한의 85% 이상을 사용했습니다. 상한 도달 시 신규 폐기 확정이 서버에서 거부되니 잔여 건수를 미리 확인해 주세요.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> 폐기 도서 목록을 불러오는 중…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">제목 / 저자</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">장르</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">출판사</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">ISBN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">상태</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((book) => (
                  <tr key={book.bookId} className="border-b border-border hover:bg-muted/25 transition-colors">
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="text-sm font-medium text-foreground truncate">{book.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground">{kdcClassToGenre(book.kdcClass)}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground truncate max-w-[160px]">{book.publisher}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{book.isbn}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: RED }}>
                        <Trash2 className="w-3 h-3 flex-shrink-0" /> 폐기 확정
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                      {books.length === 0 ? "폐기 확정된 도서가 없습니다." : "조건에 해당하는 도서가 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{filtered.length}건 표시 중</span>
          {totalPages > 1 && (() => {
            const WINDOW = 5;
            const start = Math.floor(page / WINDOW) * WINDOW;
            const end = Math.min(totalPages - 1, start + WINDOW - 1);
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

                <button onClick={() => goToPage(page + 1)} disabled={page === totalPages - 1} className={navBtnClass} aria-label="다음 페이지">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => goToPage(totalPages - 1)} disabled={page === totalPages - 1} className={navBtnClass} aria-label="끝 페이지">
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })()}
        </div>
      </Card>
    </div>
  );
}
