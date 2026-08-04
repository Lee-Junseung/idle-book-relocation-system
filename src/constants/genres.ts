// KDC(한국십진분류법) 대분류 10종 — 서버 API 없이 프론트 상수로 고정 관리
export const KDC_GENRES = [
    "총류",
    "철학",
    "종교",
    "사회과학",
    "자연과학",
    "기술과학",
    "예술",
    "언어",
    "문학",
    "역사",
] as const;

export type KdcGenre = (typeof KDC_GENRES)[number];