// 폐기 확정 도서 목록 + 도서관법 시행령 [별표 7] 제3호(연간 폐기 상한: 전체 장서의 100분의 7) 준수 현황 페이지
import { useEffect, useMemo, useState } from "react";
import { Trash2, Search, Loader2, AlertTriangle, Gauge, ShieldAlert, ShieldCheck, Archive } from "lucide-react";

import { Card, SectionHeader, MetricCard, withAlpha } from "../components";
import { NAV, RED, AMBER, GREEN } from "../constants/colors";
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

export function DiscardedBooksPage() {
  const [books, setBooks] = useState<DiscardedBookItem[]>([]);
  const [quota, setQuota] = useState<DiscardQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const tone = quota ? quotaTone(quota) : null;
  const progressPct = quota && quota.capCount > 0
    ? Math.min(100, Math.round((quota.discardedCount / quota.capCount) * 1000) / 10)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="폐기 처리 도서 목록"
        sub="연간 폐기·제적 비율 관리"
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="전체 장서 수"
              value={quota.totalBooks.toLocaleString()}
              sub="기준 도서관 전체"
              color={NAV}
              icon={Archive}
            />
            <MetricCard
              label="누적 폐기 확정"
              value={quota.discardedCount.toLocaleString()}
              sub={`상한 ${quota.capCount.toLocaleString()}권 중`}
              color={tone!.color}
              icon={Trash2}
            />
            <MetricCard
              label="연간 폐기 상한 (7%)"
              value={quota.capCount.toLocaleString()}
              sub={`전체 장서 × ${Math.round(quota.capRatio * 100)}%`}
              color={AMBER}
              icon={Gauge}
            />
            <MetricCard
              label="잔여 처리 가능 건수"
              value={quota.remaining.toLocaleString()}
              sub={quota.capReached ? "신규 폐기 확정 불가" : "서버에서 자동 검증"}
              color={quota.capReached ? RED : GREEN}
              icon={quota.capReached ? ShieldAlert : ShieldCheck}
            />
          </div>

          <Card className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">상한 대비 처리 현황</span>
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: tone!.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {quota.discardedCount.toLocaleString()} / {quota.capCount.toLocaleString()}권 ({progressPct}%) · {tone!.label}
              </span>
            </div>
            <div className="h-2.5 rounded-full w-full overflow-hidden" style={{ backgroundColor: withAlpha(tone!.color, 0.13) }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, backgroundColor: tone!.color }}
              />
            </div>
            {quota.capReached && (
              <p className="text-xs mt-1" style={{ color: RED }}>
                연간 폐기 상한에 도달했습니다. 이 상태에서는 마모 처리 현황 화면에서 새로운 폐기 확정을 요청해도 서버가 거부합니다. 추가 폐기가 필요하면 도서관운영위원회 심의를 거쳐 상한 초과를 결정해야 합니다 (도서관법 시행령 [별표 7] 제3호 단서).
              </p>
            )}
          </Card>
        </>
      )}

      <Card className="p-4 flex flex-wrap items-center gap-3">
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
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} / {books.length}건</span>
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
                {filtered.map((book) => (
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
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          <span className="text-sm text-muted-foreground">{filtered.length}건 표시 중</span>
        </div>
      </Card>
    </div>
  );
}
