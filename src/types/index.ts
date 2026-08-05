// 도서관 마모/이관 관리 시스템에서 쓰는 도메인 타입(도서, 분관, 이관 항목, 마모 점검, 확인 모달, 사용자 세션 등)을 정의
export type BookStatus = "대기" | "폐기승인" | "이관승인" | "보존결정";

// 마모도/점검 점수는 실제로 1~5만 유효(0은 DOT_COLORS에서 "미평가" sentinel로 예약됨).
export type ScoreValue = 1 | 2 | 3 | 4 | 5;

export type DemandLevel = "높음" | "보통" | "낮음";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  branch: string;
  lastLoan: string;
  damage: ScoreValue;
  turnover: number;
  copies: number;
  status: BookStatus;
  // 폐기/이관/보존 결정 확정 API(PUT /results/{resultBatchId}/decision) 응답의 decidedAt으로 채워짐.
  // 결정이 아직 확정되지 않은 도서는 undefined.
  decidedDate?: string;
  // 유휴화 점수 API(/api/checklists) 응답으로 채워지는 필드.
  // 점검 리스트가 아직 등록되지 않은 도서(마모 점검 대상)에만 존재하므로 optional.
  idleScore?: number;
  sage?: number;
  sloan?: number;
  sdecay?: number;
}

export interface Branch {
  id: string;
  name: string;
  district: string;
  hub: boolean;
  distance: number;
  collection: number;
}

// 이관 우선순위 관련 타입(RelocationItem 등)은 types/transfers.ts로 이동했습니다.
// (백엔드 /api/transfers 명세와 1:1로 대응하는 도메인이라 checklists/dashboard와 동일하게 별도 파일로 분리)

export interface DamageInspection {
  physicalCover: ScoreValue;
  physicalTear: ScoreValue;
  physicalStain: ScoreValue;
  physicalMarks: ScoreValue;
  physicalAccessories: ScoreValue;
  physicalSmell: ScoreValue;
  contentRecency: ScoreValue;
  contentAlternative: ScoreValue;
  contentValue: ScoreValue;
  contentReadability: ScoreValue;
  useDuplicate: ScoreValue;
  useDemand: ScoreValue;
  useRarity: ScoreValue;
  useShelfEfficiency: ScoreValue;
  useDonation: ScoreValue;

  inspector: string;
  date: string;
}

// Book의 필드가 바뀌면 이 타입도 자동으로 따라감
export type ModalBookInfo = Pick<Book, "id" | "title" | "author" | "lastLoan" | "damage" | "turnover" | "branch">;

export interface ModalSummaryItem {
  label: string;
  value: string;
  color: string;
  sub?: string;
}

export interface ModalConfig {
  title: string;
  body: string;
  detail?: string;
  confirmLabel: string;
  confirmColor?: string;
  icon: "danger" | "warning";
  bookInfo?: ModalBookInfo;
  summaryItems?: ModalSummaryItem[];
  onConfirm: () => void;
}

export interface User {
  id: string;
  password: string;
  name: string;
  email: string;
  nickname: string;
  librarianId: string;
}

// 로그인 API 응답(name, email, nickname, librarianCode, accessToken)에 대응.
// librarianId는 점검 리스트 등록 API(ChecklistRegisterRequest.librarianCode)에 그대로 쓰인다.
// accessToken은 로그인 이후 모든 API 요청의 Authorization 헤더에 그대로 사용된다 (api/client.ts 참고).
export type Session = Pick<User, "name" | "email" | "nickname" | "librarianId"> & {
  accessToken: string;
};

export interface LoanHistoryPoint {
  year: string;
  v: number;
}

export type PageId = "overview" | "wear-queue" | "wear-manage" | "relocation" | "discarded";
