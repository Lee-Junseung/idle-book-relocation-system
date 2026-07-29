// 이관 우선순위 큐 데이터 계층.
// 계산 로직(하드필터/매칭 스코어)은 데이터 출처와 무관한 순수 함수로 분리했고,
// 데이터는 fetchRawRelocationRecords()를 통해 API에서 받아온다는 전제로 구성했다.
// → 실제 API가 붙으면 fetchRawRelocationRecords() 내부의 fetch 호출만 교체하면 된다.
import { RelocationItem, HardFilterResult } from "../types";

// ── 하드 필터링 (사전 통과 조건) ──────────────────────────────────────────
const HARD_FILTER_DISTANCE_KM = 15;
const HARD_FILTER_MIN_HOLDING_YEARS = 2;
const HARD_FILTER_MIN_DAMAGE_SCORE = 5;

export function computeHardFilter(
  distance: number,
  loanAvailable: "Y" | "N",
  holdingYears: number,
  damageScore: number
): HardFilterResult {
  const distanceOk = distance <= HARD_FILTER_DISTANCE_KM;
  const loanAvailableOk = loanAvailable === "Y";
  const holdingYearsOk = holdingYears >= HARD_FILTER_MIN_HOLDING_YEARS;
  const damageOk = damageScore >= HARD_FILTER_MIN_DAMAGE_SCORE;
  return {
    distanceOk,
    loanAvailableOk,
    holdingYearsOk,
    damageOk,
    passed: distanceOk && loanAvailableOk && holdingYearsOk && damageOk,
  };
}

// ── 매칭 스코어 세부 지표 ────────────────────────────────────────────────

// 거리 감쇄 필터: Fdist(Dorigin, D) = 1 / (1 + e^(0.2×(d−15)))  → 0~1
export function computeFDist(distance: number): number {
  return 1 / (1 + Math.exp(0.2 * (distance - HARD_FILTER_DISTANCE_KM)));
}

// 도서 수요도: Sdemand(i, D) = 100 × (목적지 도서관 D의 최근 12개월간 KDCi 대출 비율)
export function computeSDemand(kdcLoanRatio12m: number): number {
  return +(100 * kdcLoanRatio12m).toFixed(1);
}

// 수요-공급 불일치 해소 점수: Sgap(i, D) = 100 × max(0, (대출비율−소장비율) / 대출비율)
export function computeSGap(kdcLoanRatio12m: number, kdcHoldingRatio: number): number {
  if (kdcLoanRatio12m <= 0) return 0;
  const raw = 100 * Math.max(0, (kdcLoanRatio12m - kdcHoldingRatio) / kdcLoanRatio12m);
  return +raw.toFixed(1);
}

// 공간 효율성 점수: Sspace(D) = max(0, 100×(1 − 적정소장권수/현재소장권수))
// 적정 소장 권수(D) = 건물면적(D) × 120 × 0.35, 작은 도서관은 정책 보너스 +15점 추가
// 주의: PDF에 상한(cap) 명시가 없으나 보너스 가산 시 100 초과가 가능해 표시 일관성을 위해 100으로 캡핑함(가정).
export function computeSSpace(buildingArea: number, currentHoldings: number, isSmallLibrary: boolean): number {
  const properHoldings = buildingArea * 120 * 0.35;
  const base = Math.max(0, 100 * (1 - properHoldings / currentHoldings));
  const withBonus = isSmallLibrary ? base + 15 : base;
  return +Math.min(100, withBonus).toFixed(1);
}

// 최종 매칭 스코어: M(i, D) = 0.3×Fdist + 0.25×Sdemand + 0.25×Sgap + 0.2×Sspace
// 주의: Fdist(0~1)를 타 지표(0~100)와 동일 스케일로 비교하기 위해 100배 스케일링 후 0.3 가중치 적용(가정, 실질 가중치 30).
export function computeMatchingScore(fDist: number, sDemand: number, sGap: number, sSpace: number): number {
  const distC = fDist * 100 * 0.3;
  const demandC = sDemand * 0.25;
  const gapC = sGap * 0.25;
  const spaceC = sSpace * 0.2;
  return Math.round(distC + demandC + gapC + spaceC);
}

// ── API로부터 받아올 원시 레코드 형태 ───────────────────────────────────
// 계산에 필요한 최소 원자료. 여러 API/DB에서 이 형태로 조합해서 채워주면 된다.
export interface RelocationRawRecord {
  title: string;
  genre: string;
  from: string;
  to: string;
  genreDemand: RelocationItem["genreDemand"];
  stockShortage: number;
  distance: number;                 // 도서관 간 거리(km) — Haversine 계산 결과 (위경도 기반)
  status: RelocationItem["status"];
  hubDirection: RelocationItem["hubDirection"];

  // 하드필터용 원자료
  loanAvailable: "Y" | "N";         // 정보나루 API bookExist.loanAvailable
  holdingYears: number;             // 등록일자 경과 연수
  damageScore: number;              // 파손 검수 점수 (사서 수동 입력, 10점 만점)

  // 매칭 스코어용 원자료
  kdcLoanRatio12m: number;          // 목적지 도서관의 최근 12개월 해당 KDC 대출 비율 (0~1)
  kdcHoldingRatio: number;          // 목적지 도서관의 해당 KDC 소장 비율 (0~1)
  buildingArea: number;             // 목적지 도서관 건물면적 (㎡)
  currentHoldings: number;          // 목적지 도서관 현재 소장 권수
  isSmallLibrary: boolean;          // 소규모 도서관 정책 보너스 대상 여부
}

// ── API 연동 지점 ────────────────────────────────────────────────────────
// TODO: 실제 엔드포인트로 교체. 예상되는 데이터 출처:
//   - 정보나루 API        : loanAvailable, kdcLoanRatio12m
//   - 도서관 시스템 API    : holdingYears, buildingArea, currentHoldings, distance(위경도 → Haversine)
//   - 사서 수동 입력 DB    : damageScore, isSmallLibrary
// 아래는 API 연동 전 임시 목데이터이며, 실제 연동 시 이 함수 내부만 교체하면
// 나머지 계산/화면 로직은 수정할 필요가 없다.
async function fetchRawRelocationRecords(): Promise<RelocationRawRecord[]> {
  // TODO: const res = await fetch("/api/relocation/raw-records");
  //       if (!res.ok) throw new Error("이관 후보 데이터를 불러오지 못했습니다.");
  //       return res.json();
  return MOCK_RAW_RECORDS;
}

const MOCK_RAW_RECORDS: RelocationRawRecord[] = [
  {
    title: "머신러닝 입문", genre: "컴퓨터공학", from: "북수원도서관", to: "영통도서관", genreDemand: "높음", stockShortage: 94, distance: 8.7, status: "대기", hubDirection: "발신",
    loanAvailable: "Y", holdingYears: 3, damageScore: 8, isSmallLibrary: false,
    kdcLoanRatio12m: 0.42, kdcHoldingRatio: 0.18, buildingArea: 2600, currentHoldings: 118000
  },
  {
    title: "수원화성 건축사", genre: "향토사", from: "북수원도서관", to: "수원시립중앙도서관", genreDemand: "높음", stockShortage: 88, distance: 4.1, status: "대기", hubDirection: "발신",
    loanAvailable: "Y", holdingYears: 6, damageScore: 7, isSmallLibrary: false,
    kdcLoanRatio12m: 0.35, kdcHoldingRatio: 0.22, buildingArea: 4200, currentHoldings: 210000
  },
  {
    title: "유기화학 (9판)", genre: "화학", from: "권선도서관", to: "북수원도서관", genreDemand: "높음", stockShortage: 82, distance: 6.2, status: "대기", hubDirection: "수신",
    loanAvailable: "Y", holdingYears: 4, damageScore: 9, isSmallLibrary: false,
    kdcLoanRatio12m: 0.31, kdcHoldingRatio: 0.09, buildingArea: 1500, currentHoldings: 64000
  },
  {
    title: "인지심리학 기초", genre: "심리학", from: "북수원도서관", to: "광교도서관", genreDemand: "높음", stockShortage: 79, distance: 5.8, status: "대기", hubDirection: "발신",
    loanAvailable: "Y", holdingYears: 2, damageScore: 6, isSmallLibrary: false,
    kdcLoanRatio12m: 0.38, kdcHoldingRatio: 0.15, buildingArea: 3100, currentHoldings: 96000
  },
  {
    title: "현대 세계사 Vol. I", genre: "역사학", from: "망포도서관", to: "북수원도서관", genreDemand: "보통", stockShortage: 71, distance: 9.3, status: "대기", hubDirection: "수신",
    loanAvailable: "Y", holdingYears: 5, damageScore: 8, isSmallLibrary: false,
    kdcLoanRatio12m: 0.26, kdcHoldingRatio: 0.12, buildingArea: 1500, currentHoldings: 64000
  },
  {
    title: "미적분학: 초월함수", genre: "수학", from: "북수원도서관", to: "권선도서관", genreDemand: "보통", stockShortage: 66, distance: 6.2, status: "대기", hubDirection: "발신",
    loanAvailable: "Y", holdingYears: 3, damageScore: 7, isSmallLibrary: true,
    kdcLoanRatio12m: 0.29, kdcHoldingRatio: 0.20, buildingArea: 900, currentHoldings: 38000
  },
  {
    title: "경제학 원리", genre: "경제학", from: "영통도서관", to: "북수원도서관", genreDemand: "낮음", stockShortage: 55, distance: 8.7, status: "대기", hubDirection: "수신",
    loanAvailable: "Y", holdingYears: 1, damageScore: 9, isSmallLibrary: false,
    kdcLoanRatio12m: 0.19, kdcHoldingRatio: 0.14, buildingArea: 2600, currentHoldings: 118000
  },
];

// ── 원시 레코드 → 화면용 RelocationItem 변환 ────────────────────────────
export async function fetchRelocationQueue(): Promise<RelocationItem[]> {
  const raw = await fetchRawRelocationRecords();

  return raw
    .map((r) => {
      const { kdcLoanRatio12m, kdcHoldingRatio, buildingArea, currentHoldings, ...rest } = r;

      const hardFilter = computeHardFilter(r.distance, r.loanAvailable, r.holdingYears, r.damageScore);
      const fDist = computeFDist(r.distance);
      const sDemand = computeSDemand(kdcLoanRatio12m);
      const sGap = computeSGap(kdcLoanRatio12m, kdcHoldingRatio);
      const sSpace = computeSSpace(buildingArea, currentHoldings, r.isSmallLibrary);
      const score = computeMatchingScore(fDist, sDemand, sGap, sSpace);

      return { ...rest, hardFilter, fDist, sDemand, sGap, sSpace, score } as Omit<RelocationItem, "rank">;
    })
    .sort((a, b) => b.score - a.score)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}