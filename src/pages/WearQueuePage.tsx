// 6개월 이상 대출 이력이 없어 마모 점검이 필요한 도서 목록을 보여주고, 점검 리스트 등록을 시작하는 페이지
import { useState } from "react";
import { ClipboardList, CalendarClock } from "lucide-react";
import { Card, SectionHeader, InspectionChecklistModal } from "../components";
import { NAV, AMBER } from "../constants/colors";
import { withAlpha } from "../components";
import { monthsSince } from "../data/wearUtils";
import { Book, DamageInspection } from "../types";
import { averageScore } from "../data/damageInspections";
import { clampToScore } from "../data/seed";

export function WearQueuePage({
  books, setBooks, inspections, setInspections, inspectorName,
}: {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  inspections: Record<string, DamageInspection>;
  setInspections: React.Dispatch<React.SetStateAction<Record<string, DamageInspection>>>;
  inspectorName?: string;
}) {
  const branchFilter = "북수원도서관";
  const [checklistTarget, setChecklistTarget] = useState<Book | null>(null);

  // 필터 기준: 최근 대출일로부터 6개월 이상 경과 + 아직 점검 리스트 미등록
  const queueBooks = books
    .filter((b) => {
      const insp = inspections[b.id];
      const isNotInspected = !insp || insp.date === "-";
      return b.branch === branchFilter && monthsSince(b.lastLoan) >= 6 && isNotInspected;
    })
    .sort((a, b2) => monthsSince(b2.lastLoan) - monthsSince(a.lastLoan));

  const handleChecklistSave = (insp: DamageInspection) => {
    if (!checklistTarget) return;
    const targetId = checklistTarget.id;
    setInspections((prev) => ({ ...prev, [targetId]: insp }));
    // 개선: 인라인 클램프 중복 대신 공용 clampToScore 사용 (ScoreValue 타입과도 정합)
    const avgRounded = clampToScore(averageScore(insp));
    setBooks((prev) => prev.map((b) => b.id === targetId ? { ...b, damage: avgRounded } : b));
    setChecklistTarget(null);
  };

  return (
    <>
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
          title="마모 점검 대상 목록"
          sub={`점검 리스트 미등록 도서 자동 추출`}
        />

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">제목 / 저자</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">장르</th>
                  <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">연 대출율</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">최근 대출일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">경과 개월</th>
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
                    <td className="hidden xl:table-cell px-4 py-3 text-sm text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{book.turnover.toFixed(1)}/yr</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{book.lastLoan}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: withAlpha(AMBER, 0.08), color: AMBER }}>
                        {monthsSince(book.lastLoan)}개월 경과
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setChecklistTarget(book)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-medium hover:opacity-85 active:scale-95 transition-transform whitespace-nowrap"
                        style={{ backgroundColor: NAV }}>
                        <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" /> 점검 등록
                      </button>
                    </td>
                  </tr>
                ))}
                {queueBooks.length === 0 && (
                  <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                    <CalendarClock className="w-5 h-5 mx-auto mb-2 opacity-40" />
                    현재 점검이 필요한 도서가 없습니다. 모든 대상 도서의 점검 리스트가 등록되었습니다.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            {/* 버그 수정: "유휴화 점수 70점 이상"이라는 문구가 실제 필터 기준(6개월 경과)과 달랐음 */}
            <span className="text-sm text-muted-foreground">{queueBooks.length}건 · 최근 대출일로부터 6개월 이상 경과한 도서입니다</span>
          </div>
        </Card>
      </div>
    </>
  );
}
