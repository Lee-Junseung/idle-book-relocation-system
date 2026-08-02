import { DamageInspection, ScoreValue } from "../types";

export type InspKey = Exclude<keyof DamageInspection, "inspector" | "date">;

export const INSP_GROUPS: {
    group: string;
    items: { key: InspKey; label: string; checkItemId: number }[];
}[] = [
        {
            group: "물리적 상태 (외형)",
            items: [
                { key: "physicalCover", label: "표지 및 제본 상태", checkItemId: 1 },
                { key: "physicalTear", label: "종이 훼손 (찢김/접힘)", checkItemId: 2 },
                { key: "physicalStain", label: "종이 변색 및 오염", checkItemId: 3 },
                { key: "physicalMarks", label: "낙서 및 하이라이트", checkItemId: 4 },
                { key: "physicalAccessories", label: "부속 자료 완비 여부", checkItemId: 5 },
                { key: "physicalSmell", label: "냄새 및 곰팡이 상태", checkItemId: 6 },
            ],
        },
        {
            group: "내용 및 정보 (가치)",
            items: [
                { key: "contentRecency", label: "정보의 최신성", checkItemId: 7 },
                { key: "contentAlternative", label: "신판 및 대체재 유무", checkItemId: 8 },
                { key: "contentValue", label: "학술·교양적 가치", checkItemId: 9 },
                { key: "contentReadability", label: "가독성 (폰트·가독 상태)", checkItemId: 10 },
            ],
        },
        {
            group: "이용 및 보존 (운영)",
            items: [
                { key: "useDuplicate", label: "복본(중복) 여부", checkItemId: 11 },
                { key: "useDemand", label: "향후 수요 가능성", checkItemId: 12 },
                { key: "useRarity", label: "절판 및 희귀성", checkItemId: 13 },
                { key: "useShelfEfficiency", label: "서가 공간 효율성", checkItemId: 14 },
                { key: "useDonation", label: "기증 및 재활용성", checkItemId: 15 },
            ],
        },
    ];

export const INSP_ITEMS_FLAT = INSP_GROUPS.flatMap((g) => g.items);

// 15개 항목 평균 — damage dot(1~5) 표시용. 백엔드 totalScore(15개 합)와 별개 계산
export function averageScore(insp: DamageInspection): number {
    const sum = INSP_ITEMS_FLAT.reduce((s, { key }) => s + insp[key], 0);
    return sum / INSP_ITEMS_FLAT.length;
}

// 반올림 후 1~5로 클램핑
export function clampToScore(n: number): ScoreValue {
    return Math.max(1, Math.min(5, Math.round(n))) as ScoreValue;
}