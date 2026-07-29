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

// 하드 필터링 결과 (사전 통과 조건, PDF "① 하드 필터링 제약 조건")
export interface HardFilterResult {
  distanceOk: boolean;      // 도서관 간 거리 ≤ 15km (Haversine)
  loanAvailableOk: boolean; // 대출 가능 상태 (정보나루 API bookExist, loanAvailable === 'Y')
  holdingYearsOk: boolean;  // 최소 보유 기간 ≥ 2년 (등록일자 경과 연수)
  damageOk: boolean;        // 파손 검수 통과, 파손점수 ≥ 5점 (10점 만점)
  passed: boolean;          // 4개 조건 모두 통과 여부
}

export interface RelocationItem {
  rank: number;
  title: string;
  genre: string;
  from: string;
  to: string;
  genreDemand: DemandLevel; // 표시용 (장르 수요 등급 컬럼)
  stockShortage: number;    // 표시용 (재고 부족률 컬럼, %)
  distance: number;         // km, 하드필터 ①번 조건 및 Fdist 계산에 사용

  // 하드 필터링 원본 데이터 (사서 수동 입력 / API 조회 결과)
  loanAvailable: "Y" | "N"; // 정보나루 API bookExist.loanAvailable
  holdingYears: number;     // 등록일자 경과 연수
  damageScore: number;      // 파손 검수 점수 (10점 만점, 사서 수동 입력)
  hardFilter: HardFilterResult; // 위 4개 원본값으로 산출한 통과 여부

  // 도서 상호대차 매칭 스코어 M(i, D) = 0.3×Fdist + 0.25×Sdemand + 0.25×Sgap + 0.2×Sspace 산출용 지표
  fDist: number;           // 거리 감쇄 필터, 0~1 (1 / (1 + e^(0.2×(d−15))))
  sDemand: number;         // 도서 수요도, 0~100 (목적지 도서관 최근 12개월 해당 KDC 대출 비율 ×100)
  sGap: number;            // 수급 불일치 해소 점수, 0~100
  sSpace: number;          // 공간 효율성 점수, 0~100 (소규모 도서관 +15 보너스 반영된 최종값)
  isSmallLibrary: boolean; // Sspace 산출 시 정책 보너스(+15) 적용 여부

  score: number;           // 최종 매칭 스코어 M(i, D)
  status: "대기" | "실행완료" | "종료";
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

// 로그인 API 응답(name, email)에 실제로 존재하는 필드만 포함.
// id/librarianId는 로그인 응답에 없고 현재 화면 어디서도 쓰지 않아 제외함.
// 나중에 로그인 후 id/librarianId가 필요해지면, 백엔드 응답에 포함시키거나 "내 정보 조회" API를 추가로 붙여서 이 타입에 필드를 다시 추가하면 됨.
export type Session = Pick<User, "name" | "email">;

export interface LoanHistoryPoint {
  year: string;
  v: number;
}

export type PageId = "overview" | "wear-queue" | "wear-manage" | "relocation";