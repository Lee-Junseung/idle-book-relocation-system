// 유휴화 점수 산정 도서 중 점검 리스트가 등록되지 않은 도서 목록을 보여주고, 점검 리스트 등록을 시작하는 페이지
import { useState } from "react";
import { ClipboardList, CalendarClock } from "lucide-react";
import { Card, SectionHeader, InspectionChecklistModal } from "../components";
import { NAV } from "../constants/colors";
import { IdleScoreBar } from "../components/IdleScoreBar";
import { Book, DamageInspection } from "../types";
import { averageScore } from "../data/damageInspections";
import { clampToScore } from "../data/seed";

import { CURRENT_LIBRARY } from "../constants/library";

export function WearQueuePage({
  books, setBooks, inspections, setInspections, inspectorName,
}: {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  inspections: Record<string, DamageInspection>;
  setInspections: React.Dispatch<React.SetStateAction<Record<string, DamageInspection>>>;
  inspectorName?: string;
}) {
  const branchFilter = CURRENT_LIBRARY.name;
  const [checklistTarget, setChecklistTarget] = useState<Book | null>(null);

  // 필터 기준: 유휴화 점수 목록(books)에 포함된 해당 지점 도서 중 점검 리스트 미등록 건
  // 정렬은 별도로 하지 않고 서버(유휴화 점수 API)가 내려준 순서를 그대로 사용
  const queueBooks = books.filter((b) => {
    const insp = inspections[b.id];
    const isNotInspected = !insp || insp.date === "-";
    return b.branch === branchFilter && isNotInspected;
  });

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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">유휴화 점수</th>
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
                      <button onClick={() => setChecklistTarget(book)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-medium hover:opacity-85 active:scale-95 transition-transform whitespace-nowrap"
                        style={{ backgroundColor: NAV }}>
                        <ClipboardList className="w-3.5 h-3.5 flex-shrink-0" /> 점검 등록
                      </button>
                    </td>
                  </tr>
                ))}
                {queueBooks.length === 0 && (
                  <tr><td colSpan={4} className="py-16 text-center text-sm text-muted-foreground">
                    <CalendarClock className="w-5 h-5 mx-auto mb-2 opacity-40" />
                    현재 점검이 필요한 도서가 없습니다. 모든 대상 도서의 점검 리스트가 등록되었습니다.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-sm text-muted-foreground">{queueBooks.length}건 · 유휴화 점수 산정 도서 중 점검 리스트가 등록되지 않은 도서입니다</span>
          </div>
        </Card>
      </div>
    </>
  );
}