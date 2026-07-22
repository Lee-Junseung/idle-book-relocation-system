// 도서 마모 점검 항목 정의와, 도서별 점검 데이터(레거시 4항목 + 시드 기반 추정 11항목)를 생성하는 파일
import { DamageInspection, ScoreValue } from "../types";
import { ALL_BOOKS } from "./books";
import { hashCode, clampToScore } from "./seed";

type InspKey = Exclude<keyof DamageInspection, "inspector" | "date">;

export const INSP_GROUPS: { group: string; items: { key: InspKey; label: string }[] }[] = [
  {
    group: "물리적 상태 (외형)",
    items: [
      { key: "physicalCover",       label: "표지 및 제본 상태" },
      { key: "physicalTear",        label: "종이 훼손 (찢김/접힘)" },
      { key: "physicalStain",       label: "종이 변색 및 오염" },
      { key: "physicalMarks",       label: "낙서 및 하이라이트" },
      { key: "physicalAccessories", label: "부속 자료 완비 여부" },
      { key: "physicalSmell",       label: "냄새 및 곰팡이 상태" },
    ],
  },
  {
    group: "내용 및 정보 (가치)",
    items: [
      { key: "contentRecency",     label: "정보의 최신성" },
      { key: "contentAlternative", label: "신판 및 대체재 유무" },
      { key: "contentValue",       label: "학술·교양적 가치" },
      { key: "contentReadability", label: "가독성 (폰트·가독 상태)" },
    ],
  },
  {
    group: "이용 및 보존 (운영)",
    items: [
      { key: "useDuplicate",       label: "복본(중복) 여부" },
      { key: "useDemand",          label: "향후 수요 가능성" },
      { key: "useRarity",          label: "절판 및 희귀성" },
      { key: "useShelfEfficiency", label: "서가 공간 효율성" },
      { key: "useDonation",        label: "기증 및 재활용성" },
    ],
  },
];

export const INSP_ITEMS_FLAT: { key: InspKey; label: string }[] = INSP_GROUPS.flatMap((g) => g.items);

// 실제 사서가 입력한 4개 항목(표지/종이훼손/오염/제본)만 보유한 레거시 점검 기록.
// 나머지 11개 항목은 시드 기반으로 추정 생성한다 (seededScore).
const LEGACY_SCORES: Record<string, { cover: ScoreValue; pages: ScoreValue; binding: ScoreValue; stain: ScoreValue; inspector: string; date: string }> = {
  "BK-10041": { cover:5, pages:5, binding:4, stain:5, inspector:"김민지 사서", date:"2024-11-28" },
  "BK-10078": { cover:3, pages:3, binding:3, stain:3, inspector:"이준혁 사서", date:"2024-12-03" },
  "BK-10095": { cover:5, pages:4, binding:5, stain:5, inspector:"박서연 사서", date:"2024-10-15" },
  "BK-10112": { cover:2, pages:2, binding:2, stain:2, inspector:"최다은 사서", date:"2024-12-10" },
  "BK-10134": { cover:4, pages:4, binding:4, stain:4, inspector:"김민지 사서", date:"2024-11-05" },
  "BK-10156": { cover:3, pages:3, binding:3, stain:3, inspector:"이준혁 사서", date:"2024-12-01" },
  "BK-10183": { cover:5, pages:5, binding:5, stain:4, inspector:"최다은 사서", date:"2024-09-22" },
  "BK-10199": { cover:2, pages:2, binding:2, stain:1, inspector:"강태양 사서", date:"2024-12-08" },
  "BK-10218": { cover:5, pages:5, binding:5, stain:5, inspector:"이준혁 사서", date:"2024-08-30" },
  "BK-10231": { cover:1, pages:1, binding:1, stain:1, inspector:"박서연 사서", date:"2024-12-12" },
  "BK-10245": { cover:4, pages:4, binding:4, stain:3, inspector:"최다은 사서", date:"2024-10-28" },
  "BK-10271": { cover:2, pages:2, binding:2, stain:2, inspector:"김민지 사서", date:"2024-12-05" },
};

function seededScore(bookId: string, key: string, base: number): ScoreValue {
  const h = hashCode(bookId + key);
  const jitter = (h % 3) - 1;
  return clampToScore(base + jitter);
}

// 레거시 4항목 기록이 있는 도서: 실제 입력값 + 시드 기반 추정 11항목으로 완성
function buildFromLegacy(id: string, legacy: (typeof LEGACY_SCORES)[string]): DamageInspection {
  const anchor = clampToScore((legacy.cover + legacy.pages + legacy.binding + legacy.stain) / 4);
  return {
    physicalCover: legacy.cover,
    physicalTear: legacy.pages,
    physicalStain: legacy.stain,
    physicalMarks: seededScore(id, "marks", anchor),
    physicalAccessories: seededScore(id, "acc", legacy.binding),
    physicalSmell: seededScore(id, "smell", legacy.stain),
    contentRecency: seededScore(id, "recency", 3),
    contentAlternative: seededScore(id, "alt", 3),
    contentValue: seededScore(id, "value", 3),
    contentReadability: seededScore(id, "read", legacy.pages),
    useDuplicate: seededScore(id, "dup", 3),
    useDemand: seededScore(id, "demand", 3),
    useRarity: seededScore(id, "rarity", 3),
    useShelfEfficiency: seededScore(id, "shelf", 3),
    useDonation: seededScore(id, "donation", 3),
    inspector: legacy.inspector,
    date: legacy.date,
  };
}

// 버그 수정: LEGACY_SCORES에 없는 도서(예: BK-10167, BK-10204, BK-10258, BK-10284)는
// 기존 코드에서 DAMAGE_INSPECTIONS[id]가 아예 undefined였음 -> books.ts의 damage 값을 anchor로
// 15개 항목 전부를 시드 기반으로 생성해 채운다. inspector/date는 "아직 실제 점검이 없었다"는
// 사실을 숨기지 않도록 명확한 placeholder로 표시한다.
function buildFallback(id: string, damageAnchor: ScoreValue): DamageInspection {
  const insp: Partial<DamageInspection> = {};
  for (const { key } of INSP_ITEMS_FLAT) {
    insp[key] = seededScore(id, key, damageAnchor);
  }
  return {
    ...(insp as Omit<DamageInspection, "inspector" | "date">),
    inspector: "(자동 산정 · 실제 점검 필요)",
    date: "-",
  };
}

export const DAMAGE_INSPECTIONS: Record<string, DamageInspection> = Object.fromEntries(
  ALL_BOOKS.map((book) => {
    const legacy = LEGACY_SCORES[book.id];
    const insp = legacy ? buildFromLegacy(book.id, legacy) : buildFallback(book.id, book.damage);
    return [book.id, insp];
  })
);

export function averageScore(insp: DamageInspection): number {
  const sum = INSP_ITEMS_FLAT.reduce((s, { key }) => s + insp[key], 0);
  return sum / INSP_ITEMS_FLAT.length;
}
