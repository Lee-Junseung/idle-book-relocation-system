// 이관 우선순위 큐 시드 데이터. score는 아래 공식으로 직접 계산하며, 이 값이 RelocationPage.tsx
// 하단에 표시되는 "우선순위 산출식" 문구와 반드시 일치해야 한다 (단일 출처).
import { RelocationItem, DemandLevel } from "../types";

// 점수 산출 공식: 장르 수요(40%) + 재고 부족률(35%) − 거리 패널티(25%)
export const DEMAND_POINTS: Record<DemandLevel, number> = { "높음": 95, "보통": 70, "낮음": 45 };

export function computeRelocationScore(genreDemand: DemandLevel, stockShortage: number, distance: number): number {
  const demandC = DEMAND_POINTS[genreDemand] * 0.4;
  const stockC = stockShortage * 0.35;
  // 거리(km)를 재고/수요와 비슷한 0~100 스케일로 어림 환산(×10)한 뒤 25% 가중치 적용
  const distPenalty = distance * 10 * 0.25;
  return Math.round(demandC + stockC - distPenalty);
}

type SeedItem = Omit<RelocationItem, "score" | "rank">;

// 버그 수정: 기존엔 score가 수기로 입력된 값(97, 93, 87...)이라 RelocationPage.tsx가 사서에게
// 보여주는 산출 공식("장르수요 40% + 재고부족률 35% − 거리패널티 25%")으로 검산하면 전혀 맞지
// 않았음(예: 1위 항목은 공식상 약 49점인데 97점으로 저장돼 있었음). score를 공식으로 직접 계산하고,
// 그 결과를 기준으로 rank를 다시 매겨 화면에 보이는 공식과 실제 데이터를 일치시킨다.
const SEED: SeedItem[] = [
  { title:"머신러닝 입문",       genre:"컴퓨터공학", from:"북수원도서관",     to:"영통도서관",      genreDemand:"높음", stockShortage:94, distance:8.7, status:"대기", hubDirection:"발신" },
  { title:"수원화성 건축사",     genre:"향토사",    from:"북수원도서관",     to:"수원시립중앙도서관", genreDemand:"높음", stockShortage:88, distance:4.1, status:"대기", hubDirection:"발신" },
  { title:"유기화학 (9판)",      genre:"화학",      from:"권선도서관",      to:"북수원도서관",     genreDemand:"높음", stockShortage:82, distance:6.2, status:"대기", hubDirection:"수신" },
  { title:"인지심리학 기초",     genre:"심리학",    from:"북수원도서관",     to:"광교도서관",      genreDemand:"높음", stockShortage:79, distance:5.8, status:"대기", hubDirection:"발신" },
  { title:"현대 세계사 Vol. I",  genre:"역사학",    from:"망포도서관",      to:"북수원도서관",     genreDemand:"보통", stockShortage:71, distance:9.3, status:"대기", hubDirection:"수신" },
  { title:"미적분학: 초월함수",  genre:"수학",      from:"북수원도서관",     to:"권선도서관",      genreDemand:"보통", stockShortage:66, distance:6.2, status:"대기", hubDirection:"발신" },
  { title:"경제학 원리",         genre:"경제학",    from:"영통도서관",      to:"북수원도서관",     genreDemand:"낮음", stockShortage:55, distance:8.7, status:"대기", hubDirection:"수신" },
];

export const RELOCATION_QUEUE: RelocationItem[] = SEED
  .map((item) => ({ ...item, score: computeRelocationScore(item.genreDemand, item.stockShortage, item.distance) }))
  .sort((a, b) => b.score - a.score)
  .map((item, i) => ({ ...item, rank: i + 1 }));
