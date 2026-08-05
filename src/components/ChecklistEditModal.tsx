// WearManagePage 전용 "점검리스트 수정" 모달.
// WearQueuePage의 InspectionChecklistModal(신규 등록)과 UI는 비슷하지만 입력 소스가 다르다:
// InspectionChecklistModal은 세션 내 로컬 상태(inspections)에서 initial 값을 받는다 (신규 등록 직후에만 값이 있음).
// 이 컴포넌트는 서버에서 실제로 받아온 점검 상세(BookDetailResult.checkResults)를 그대로 화면 척도(1~5)로 환산해 채운다.
// WearManagePage에 로드된 도서는 대부분 "이전 세션/다른 사서"가 등록한 것이라 로컬 상태에 해당 값이 없는 게 정상이므로, 항상 서버 데이터를 단일 출처로 사용해야 값이 비어보이는 문제가 없다.
import { useEffect, useMemo, useRef, useState } from "react";
import { X, ClipboardList, Save } from "lucide-react";
import { NAV } from "../constants/colors";
import { Book, DamageInspection, ScoreValue } from "../types";
import { INSP_GROUPS, INSP_ITEMS_FLAT, averageScore, type InspKey } from "../constants/checklistItems";
import { clampScore, getDotColor, getDotLabel, withAlpha } from "./lib";
import { BookDetailResult, CheckItemMaster } from "../types/resultChecklist";

type ScoreOrEmpty = ScoreValue | 0;
type Scores = Record<InspKey, ScoreOrEmpty>;

const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

const DEFAULT_SCORES: Scores = {
  physicalCover: 0, physicalTear: 0, physicalStain: 0, physicalMarks: 0,
  physicalAccessories: 0, physicalSmell: 0,
  contentRecency: 0, contentAlternative: 0, contentValue: 0, contentReadability: 0,
  useDuplicate: 0, useDemand: 0, useRarity: 0, useShelfEfficiency: 0, useDonation: 0,
};

// checkItemId -> InspKey 역매핑 (INSP_ITEMS_FLAT은 key -> checkItemId 방향이라 반대로 뒤집어야 함)
const KEY_BY_CHECK_ITEM_ID: Record<number, InspKey> = Object.fromEntries(
  INSP_ITEMS_FLAT.map(({ key, checkItemId }) => [checkItemId, key])
);

// 서버가 내려주는 itemScore는 문항별 만점(maxScore) 기준 점수이므로, 화면의 1~5 척도로 환산해야 버튼 UI(항상 1~5)에 그대로 채울 수 있다.
// WearManagePage.handleChecklistSave가 저장할 때 쓰는 "value/5 * maxScore" 변환의 역연산이다.
function toScoresFromDetail(
  detail: BookDetailResult,
  checkItemMaster: Record<number, CheckItemMaster>
): Scores {
  const scores: Scores = { ...DEFAULT_SCORES };
  for (const result of detail.checkResults) {
    const key = KEY_BY_CHECK_ITEM_ID[result.checkItemId];
    if (!key) continue; // 화면에서 다루지 않는 항목 ID는 무시
    const maxScore = checkItemMaster[result.checkItemId]?.maxScore ?? 5;
    const scaled = maxScore > 0 ? (result.itemScore / maxScore) * 5 : result.itemScore;
    scores[key] = clampScore(scaled) as ScoreOrEmpty;
  }
  return scores;
}

export function ChecklistEditModal({
  book, detail, checkItemMaster, inspectorDefault, onClose, onSave,
}: {
  book: Book;
  detail: BookDetailResult;
  checkItemMaster: Record<number, CheckItemMaster>;
  inspectorDefault?: string;
  onClose: () => void;
  onSave: (insp: DamageInspection) => void;
}) {
  const initialScores = useMemo(
    () => toScoresFromDetail(detail, checkItemMaster),
    [detail, checkItemMaster]
  );

  const [scores, setScores] = useState<Scores>(initialScores);
  // 서버는 점검자의 "이름"이 아니라 librarianCode만 내려주므로, 예전 점검자 이름을 그대로 복원할 방법이 없다.
  // 지금 로그인한 사서 이름(inspectorDefault)을 기본값으로 채워서, 수정하는 사람이 직접 확인/입력하게 한다.
  const [inspector, setInspector] = useState(inspectorDefault ?? "");
  const [dirty, setDirty] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const answeredCount = INSP_ITEMS_FLAT.filter(({ key }) => scores[key] !== 0).length;
  const allAnswered = answeredCount === INSP_ITEMS_FLAT.length;
  const avg = averageScore({ ...scores, inspector: "", date: "" } as DamageInspection);
  const avgRounded = clampScore(avg);

  function updateScore(key: keyof Scores, n: ScoreValue) {
    setScores((s) => ({ ...s, [key]: n }));
    setDirty(true);
  }

  function handleInspectorChange(value: string) {
    setInspector(value);
    setDirty(true);
  }

  function requestClose() {
    if (dirty && !window.confirm("변경사항이 저장되지 않았습니다. 닫으시겠습니까?")) return;
    onClose();
  }

  function handleSave() {
    if (!inspector.trim() || !allAnswered) return;
    const today = new Date().toISOString().slice(0, 10);
    onSave({ ...scores, inspector: inspector.trim(), date: detail.checkedDate ?? today } as DamageInspection);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    containerRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dirty]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={requestClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-edit-modal-title"
        tabIndex={-1}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col focus:outline-none"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: withAlpha(NAV, 0.07) }}>
              <ClipboardList className="w-4 h-4" style={{ color: NAV }} />
            </div>
            <div className="min-w-0">
              <h3 id="checklist-edit-modal-title" className="text-base font-semibold text-foreground">점검 리스트 수정</h3>
              <p className="text-sm text-muted-foreground truncate">{book.title} <span className="text-muted-foreground/70">— {book.id}</span></p>
            </div>
          </div>
          <button onClick={requestClose} aria-label="닫기" className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 pl-7 -mb-2">
            <span className="flex-1 min-w-0" />
            <div className="flex items-center gap-1 flex-shrink-0">
              {SCORE_OPTIONS.map((n) => (
                <span key={n} className="w-7 text-center text-[9px] font-medium text-muted-foreground whitespace-nowrap">
                  {n === 1 ? "양호" : n === 5 ? "불량" : ""}
                </span>
              ))}
            </div>
          </div>
          {INSP_GROUPS.map((grp, gi) => (
            <div key={grp.group} className="flex flex-col gap-2.5">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ backgroundColor: NAV }}>{gi + 1}</span>
                {grp.group}
              </p>
              <div className="flex flex-col gap-2 pl-7">
                {grp.items.map((item) => {
                  const val = scores[item.key];
                  const activeColor = getDotColor(val);
                  return (
                    <div key={item.key} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground flex-1 min-w-0">{item.label}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {SCORE_OPTIONS.map((n) => (
                          <button key={n} type="button" onClick={() => updateScore(item.key, n)}
                            className="w-7 h-7 rounded-full border text-xs font-semibold flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: n <= val ? activeColor : "transparent",
                              borderColor: n <= val ? activeColor : "#D1D5DB",
                              color: n <= val ? "#fff" : "#9CA3AF",
                            }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">종합 마모 점수 (15문항 평균)</span>
            {allAnswered ? (
              <span className="text-base font-bold" style={{ color: getDotColor(avgRounded), fontFamily: "'JetBrains Mono', monospace" }}>
                {avg.toFixed(2)} / 5.00 · {getDotLabel(avgRounded)}
              </span>
            ) : (
              <span className="text-sm font-medium text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                평가 진행 중 · {answeredCount}/{INSP_ITEMS_FLAT.length}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground font-medium">점검자</label>
            <input type="text" value={inspector} onChange={(e) => handleInspectorChange(e.target.value)}
              placeholder="점검자 이름을 입력하세요"
              className="px-3.5 py-2.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 flex-shrink-0">
          <button onClick={requestClose}
            className="px-4 py-2.5 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            취소
          </button>
          <button onClick={handleSave} disabled={!inspector.trim() || !allAnswered}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: NAV }}>
            <Save className="w-4 h-4" /> 수정 저장
          </button>
        </div>
      </div>
    </div>
  );
}
