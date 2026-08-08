// 이관(상호대차) 추천 목록 조회(GET /api/transfers) / 이관 실행(POST /api/transfers/{recommendationId}/execute) API의 요청·응답 타입
// + 화면(RelocationPage)에서 사용하는 뷰 모델 타입

// 이관 진행 상태. 목록 조회는 PENDING(대기)/IN_TRANSIT(이송중)만 요청하지만, 실행 직후 등 다른 화면 흐름에서 COMPLETED(완료)가 내려올 가능성을 열어둔다.
export type TransferStatus = "PENDING" | "IN_TRANSIT" | "COMPLETED";

// 현재 로그인한 도서관 입장에서의 이관 방향
export type TransferDirection = "발신" | "수신";

// GET /api/transfers 조회 시 사용할 상태 필터 (콤마로 이어붙여 status 쿼리파라미터로 전송)
export const ACTIVE_TRANSFER_STATUSES: TransferStatus[] = ["PENDING", "IN_TRANSIT"];

// 매칭 스코어 상세 항목 — 이미 가중치가 반영된 기여도 값이며, 4개 항목의 합이 matchingScore와 같다.
// (거리 감쇄 30% + 도서 수요도 25% + 수급 불일치 해소 25% + 공간 효율성 20%)
export interface TransferScoreDetails {
  distanceDecay: number;
  bookDemand: number;
  shortageResolution: number;
  spaceEfficiency: number;
}

// content[].alternatives[] 원소 — 동일 도서의 대안 매칭 후보
export interface TransferAlternative {
  recommendationId: number;
  originLibrary: string;
  destLibrary: string;
  distanceKm: number;
  matchingScore: number;
  direction: TransferDirection;
  status: TransferStatus;
  scoreDetails: TransferScoreDetails;
}

// GET /api/transfers 의 content[] 원소 — 이관 추천 1건
export interface TransferRecommendation {
  recommendationId: number;
  bookTitle: string;
  genre: string;
  originLibrary: string;
  destLibrary: string;
  distanceKm: number;
  matchingScore: number;
  direction: TransferDirection;
  status: TransferStatus;
  scoreDetails: TransferScoreDetails;
  alternatives: TransferAlternative[];
}

// 목록 상단 요약 통계
export interface TransferSummary {
  totalPending: number;
  totalSent: number;
  totalReceived: number;
}

export interface TransferPageable {
  pageNumber: number;
  pageSize: number;
}

// GET /api/transfers?status=&page=&size= 응답
export interface TransferListResponse {
  summary: TransferSummary;
  content: TransferRecommendation[];
  pageable: TransferPageable;
  totalElements: number;
  totalPages: number;
}

// 화면단에서 사용할 정규화된 에러 상태 (types/checklists.ts의 ChecklistErrorState와 동일한 형태로 맞춤)
export interface TransferErrorState {
  message: string;
  errorType?: string;
  statusCode?: number;
}

// RelocationPage 전용 "이관 실행 확인" 모달(TransferExecuteModal)에서 쓰는 대상 1건.
// WearManagePage 등 다른 화면의 범용 확인 모달(ModalConfig/ConfirmModal)과는 분리된 타입으로, 이관 도메인 정보(출발/도착, 거리, 매칭 스코어)를 그대로 실어 모달에서 재사용한다.
export interface TransferExecuteTarget {
  recommendationId: number;
  title: string;
  from: string;
  to: string;
  distance: number;
  score: number;
  scoreDetails: TransferScoreDetails;
}

// TransferExecuteModal에 넘기는 설정. targets가 1건이면 단건 실행, 2건 이상이면 일괄 실행 UI로 표시된다.
export interface TransferExecuteModalConfig {
  targets: TransferExecuteTarget[];
  onConfirm: () => void;
}

// 화면(RelocationPage) 표시용 뷰 모델
// alternatives도 scoreDetails를 포함해 동일한 후보 형태(RelocationCandidate)로 맞춰서, 메인 추천/대안 추천 행을 같은 컴포넌트(RelocationRowCells)로 렌더링할 수 있게 한다.
export interface RelocationCandidate {
  recommendationId: number;
  from: string;
  to: string;
  distance: number;
  score: number;
  scoreDetails: TransferScoreDetails;
  hubDirection: TransferDirection;
  status: TransferStatus;
}

export interface RelocationItem extends RelocationCandidate {
  title: string;
  genre: string;
  alternatives: RelocationCandidate[];
}

function mapCandidate(a: TransferAlternative): RelocationCandidate {
  return {
    recommendationId: a.recommendationId,
    from: a.originLibrary,
    to: a.destLibrary,
    distance: a.distanceKm,
    score: a.matchingScore,
    scoreDetails: a.scoreDetails,
    hubDirection: a.direction,
    status: a.status,
  };
}

export function mapToRelocationItem(r: TransferRecommendation): RelocationItem {
  return {
    recommendationId: r.recommendationId,
    title: r.bookTitle,
    genre: r.genre,
    from: r.originLibrary,
    to: r.destLibrary,
    distance: r.distanceKm,
    score: r.matchingScore,
    hubDirection: r.direction,
    status: r.status,
    scoreDetails: r.scoreDetails,
    alternatives: r.alternatives.map(mapCandidate),
  };
}