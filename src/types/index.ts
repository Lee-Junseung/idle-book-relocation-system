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
}

export interface Branch {
  id: string;
  name: string;
  district: string;
  hub: boolean;
  distance: number;
  collection: number;
}

export interface RelocationItem {
  rank: number;
  title: string;
  genre: string;
  from: string;
  to: string;
  genreDemand: DemandLevel;
  stockShortage: number;
  distance: number;
  score: number;
  status: "대기" | "실행완료";
  hubDirection: "발신" | "수신";
}

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
  librarianId: string;
}

export type Session = Omit<User, "password">;

export interface LoanHistoryPoint {
  year: string;
  v: number;
}

export type PageId = "overview" | "wear-queue" | "wear-manage" | "relocation";