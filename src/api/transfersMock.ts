// VITE_USE_MOCK=true 일 때 사용하는 목업 구현체.
// 실행(execute) 결과가 다음 목록 조회에 반영되어야 하므로(상태 PENDING → IN_TRANSIT), 다른 mock 파일들과 달리 모듈 스코프에 상태를 들고 있다가 in-place로 갱신한다.
import { mockDelay } from "./client";
import {
  TransferRecommendation,
  TransferStatus,
  TransferListResponse,
} from "../types/transfers";

let seq = 200;
const nextId = () => ++seq;

// 최초 상태의 이관 추천 목록.
// execute() 호출 시 이 배열의 status가 in-place로 바뀐다.
const MOCK_RECORDS: TransferRecommendation[] = [
  {
    recommendationId: 101, bookTitle: "머신러닝 입문", genre: "컴퓨터공학",
    originLibrary: "북수원도서관", destLibrary: "영통도서관", distanceKm: 8.7, matchingScore: 92,
    direction: "발신", status: "PENDING",
    scoreDetails: { distanceDecay: 22.5, bookDemand: 30.0, shortageResolution: 22.5, spaceEfficiency: 17.0 },
    alternatives: [
      { recommendationId: nextId(), originLibrary: "북수원도서관", destLibrary: "수원시립중앙도서관", distanceKm: 11.2, matchingScore: 78, direction: "발신", status: "PENDING", scoreDetails: { distanceDecay: 20.5, bookDemand: 25.0, shortageResolution: 18.0, spaceEfficiency: 14.5 } },
      { recommendationId: nextId(), originLibrary: "북수원도서관", destLibrary: "권선도서관", distanceKm: 13.4, matchingScore: 65, direction: "발신", status: "PENDING", scoreDetails: { distanceDecay: 16.0, bookDemand: 20.0, shortageResolution: 16.5, spaceEfficiency: 12.5 } },
    ],
  },
  {
    recommendationId: 102, bookTitle: "수원화성 건축사", genre: "향토사",
    originLibrary: "북수원도서관", destLibrary: "수원시립중앙도서관", distanceKm: 4.1, matchingScore: 88,
    direction: "발신", status: "PENDING",
    scoreDetails: { distanceDecay: 25.0, bookDemand: 27.0, shortageResolution: 20.0, spaceEfficiency: 16.0 },
    alternatives: [
      { recommendationId: nextId(), originLibrary: "북수원도서관", destLibrary: "광교도서관", distanceKm: 7.6, matchingScore: 70, direction: "발신", status: "PENDING", scoreDetails: { distanceDecay: 19.0, bookDemand: 22.0, shortageResolution: 16.0, spaceEfficiency: 13.0 } },
    ],
  },
  {
    recommendationId: 103, bookTitle: "유기화학 (9판)", genre: "화학",
    originLibrary: "권선도서관", destLibrary: "북수원도서관", distanceKm: 6.2, matchingScore: 81,
    direction: "수신", status: "PENDING",
    scoreDetails: { distanceDecay: 21.0, bookDemand: 24.5, shortageResolution: 23.0, spaceEfficiency: 12.5 },
    alternatives: [
      { recommendationId: nextId(), originLibrary: "권선도서관", destLibrary: "망포도서관", distanceKm: 9.9, matchingScore: 59, direction: "수신", status: "PENDING", scoreDetails: { distanceDecay: 15.0, bookDemand: 17.0, shortageResolution: 15.5, spaceEfficiency: 11.5 } },
      { recommendationId: nextId(), originLibrary: "권선도서관", destLibrary: "영통도서관", distanceKm: 12.1, matchingScore: 52, direction: "수신", status: "PENDING", scoreDetails: { distanceDecay: 13.0, bookDemand: 15.0, shortageResolution: 14.0, spaceEfficiency: 10.0 } },
    ],
  },
  {
    recommendationId: 104, bookTitle: "인지심리학 기초", genre: "심리학",
    originLibrary: "북수원도서관", destLibrary: "광교도서관", distanceKm: 5.8, matchingScore: 79,
    direction: "발신", status: "IN_TRANSIT",
    scoreDetails: { distanceDecay: 23.5, bookDemand: 22.0, shortageResolution: 19.0, spaceEfficiency: 14.5 },
    alternatives: [],
  },
  {
    recommendationId: 105, bookTitle: "현대 세계사 Vol. I", genre: "역사학",
    originLibrary: "망포도서관", destLibrary: "북수원도서관", distanceKm: 9.3, matchingScore: 71,
    direction: "수신", status: "PENDING",
    scoreDetails: { distanceDecay: 18.0, bookDemand: 20.5, shortageResolution: 21.0, spaceEfficiency: 11.5 },
    alternatives: [
      { recommendationId: nextId(), originLibrary: "망포도서관", destLibrary: "권선도서관", distanceKm: 10.7, matchingScore: 48, direction: "수신", status: "PENDING", scoreDetails: { distanceDecay: 12.0, bookDemand: 14.0, shortageResolution: 13.0, spaceEfficiency: 9.0 } },
    ],
  },
  {
    recommendationId: 106, bookTitle: "미적분학: 초월함수", genre: "수학",
    originLibrary: "북수원도서관", destLibrary: "권선도서관", distanceKm: 6.2, matchingScore: 66,
    direction: "발신", status: "PENDING",
    scoreDetails: { distanceDecay: 20.0, bookDemand: 16.0, shortageResolution: 17.0, spaceEfficiency: 13.0 },
    alternatives: [],
  },
  {
    recommendationId: 107, bookTitle: "경제학 원리", genre: "경제학",
    originLibrary: "영통도서관", destLibrary: "북수원도서관", distanceKm: 8.7, matchingScore: 55,
    direction: "수신", status: "PENDING",
    scoreDetails: { distanceDecay: 15.5, bookDemand: 12.0, shortageResolution: 16.5, spaceEfficiency: 11.0 },
    alternatives: [],
  },
];

function computeSummary() {
  return {
    totalPending: MOCK_RECORDS.filter((r) => r.status === "PENDING" || r.status === "IN_TRANSIT").length,
    totalSent: MOCK_RECORDS.filter((r) => r.direction === "발신" && r.status !== "PENDING").length,
    totalReceived: MOCK_RECORDS.filter((r) => r.direction === "수신" && r.status !== "PENDING").length,
  };
}

export const getTransferListApiMock = (
  statuses: TransferStatus[],
  page: number,
  size: number
): Promise<TransferListResponse> => {
  const filtered = MOCK_RECORDS.filter((r) => statuses.includes(r.status));
  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = page * size;
  const content = filtered.slice(start, start + size);

  return mockDelay({
    summary: computeSummary(),
    content,
    pageable: { pageNumber: page, pageSize: size },
    totalElements,
    totalPages,
  });
};

export const executeTransferApiMock = (recommendationId: number): Promise<void> => {
  const target = MOCK_RECORDS.find((r) => r.recommendationId === recommendationId);
  if (target) {
    target.status = "IN_TRANSIT";
    // 같은 도서의 다른 대안 후보들은 이미 매칭이 종료된 것으로 간주해 목록에서 제외되도록 (실제 백엔드에서도 PENDING/IN_TRANSIT 필터 목록에서 사라지는 것과 동일한 효과를 내기 위해) COMPLETED로 표기.
    target.alternatives = target.alternatives.map((a) => ({ ...a, status: "COMPLETED" }));
  } else {
    // 대안 후보(alternatives) 중 하나를 실행한 경우 — 해당 후보가 속한 상위 추천을 찾아 처리.
    // 실행된 후보만 IN_TRANSIT로 바뀌는 게 아니라, 메인 추천을 실행했을 때와 대칭이 되도록 같은 세트(메인 추천 + 나머지 대안 후보) 전체를 COMPLETED로 맞춘다.
    for (const rec of MOCK_RECORDS) {
      const alt = rec.alternatives.find((a) => a.recommendationId === recommendationId);
      if (alt) {
        rec.status = "COMPLETED";
        rec.alternatives = rec.alternatives.map((a) =>
          a.recommendationId === recommendationId ? { ...a, status: "IN_TRANSIT" } : { ...a, status: "COMPLETED" }
        );
        break;
      }
    }
  }
  return mockDelay(undefined);
};