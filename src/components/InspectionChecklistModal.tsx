// 도서 마모 점검 15개 항목의 점수를 입력받아 평균 점수를 계산하고 저장하는 모달 컴포넌트
import { useEffect, useRef, useState } from "react";
import { X, ClipboardList, Save } from "lucide-react";
import { NAV } from "../constants/colors";
import { Book, DamageInspection, ScoreValue } from "../types";
import { INSP_GROUPS, averageScore } from "../data/damageInspections";
import { clampScore, getDotColor, getDotLabel, withAlpha } from "./lib";

type Scores = Omit<DamageInspection, "inspector" | "date">;

// 개선: 점수 버튼이 1~5 리터럴 유니언(ScoreValue)으로 타입 좁혀지도록 as const 사용
const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

const DEFAULT_SCORES: Scores = {
  physicalCover: 3, physicalTear: 3, physicalStain: 3, physicalMarks: 3,
  physicalAccessories: 3, physicalSmell: 3,
  contentRecency: 3, contentAlternative: 3, contentValue: 3, contentReadability: 3,
  useDuplicate: 3, useDemand: 3, useRarity: 3, useShelfEfficiency: 3, useDonation: 3,
};

// initial(DamageInspection)에서 inspector/date를 제거해 Scores 타입에 맞는 순수 점수 객체만 남긴다.
// 기존 코드는 { ...initial }을 그대로 Scores state에 넣어 타입과 실제 런타임 값이 어긋났었음.
function toScores(initial?: DamageInspection): Scores {
  if (!initial) return { ...DEFAULT_SCORES };
  const { inspector: _inspector, date: _date, ...rest } = initial;
  return rest;
}

export function InspectionChecklistModal({
  book, initial, inspectorDefault, onClose, onSave,
}: {
  book: Book;
  initial?: DamageInspection;
  inspectorDefault?: string;
  onClose: () => void;
  onSave: (insp: DamageInspection) => void;
}) {
  // lazy init 적용: 매 렌더마다 초기값 객체를 새로 만들지 않도록 함수형 초기화로 변경
  const [scores, setScores] = useState<Scores>(() => toScores(initial));
  const [inspector, setInspector] = useState(() => initial?.inspector ?? inspectorDefault ?? "");
  const [dirty, setDirty] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // 개선: 입력 중이던 점수/점검자명이 있으면 배경 클릭·Esc로 실수로 닫는 것을 방지
  function requestClose() {
    if (dirty && !window.confirm("변경사항이 저장되지 않았습니다. 닫으시겠습니까?")) return;
    onClose();
  }

  function handleSave() {
    if (!inspector.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    onSave({ ...scores, inspector: inspector.trim(), date: initial?.date ?? today });
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    containerRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={requestClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspection-modal-title"
        tabIndex={-1}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col focus:outline-none"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: withAlpha(NAV, 0.07) }}>
              <ClipboardList className="w-4 h-4" style={{ color: NAV }} />
            </div>
            <div className="min-w-0">
              <h3 id="inspection-modal-title" className="text-base font-semibold text-foreground">{initial ? "점검 리스트 수정" : "마모 점검 리스트 등록"}</h3>
              <p className="text-sm text-muted-foreground truncate">{book.title} <span className="text-muted-foreground/70">— {book.id}</span></p>
            </div>
          </div>
          <button onClick={requestClose} aria-label="닫기" className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-5">
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
                              // 버그 수정: val이 1~5 범위를 벗어나도 DOT_COLORS[val]이 undefined가 되지 않도록 getDotColor 사용
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
            <span className="text-base font-bold" style={{ color: getDotColor(avgRounded), fontFamily: "'JetBrains Mono', monospace" }}>
              {avg.toFixed(2)} / 5.00 · {getDotLabel(avgRounded)}
            </span>
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
          <button onClick={handleSave} disabled={!inspector.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: NAV }}>
            <Save className="w-4 h-4" /> {initial ? "수정 저장" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
