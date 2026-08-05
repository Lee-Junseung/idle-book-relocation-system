// VITE_USE_MOCK=true 일 때 사용하는 목업 구현체 (DiscardedBooksPage 전용, GET /api/checklists/discarded)
import { mockDelay } from "./client";
import { DiscardedBookListData } from "../types/discardedBooks";

// 시연 도서관(경기도교육청중앙도서관) 전체 장서 수 예시값 — 실제 값은 서버의 libraries.total_books를 따름
const MOCK_TOTAL_BOOKS = 45000;

const MOCK_DISCARDED_BOOKS: DiscardedBookListData["books"] = [
  { bookId: 101, title: "1998년도 컴퓨터 활용 입문", author: "정보처리연구회", publisher: "미래사", isbn: "978-1111100001", kdcCode: "004", kdcClass: "0", callNumber: "004-정55ㅇ", coverUrl: null, status: "DISCARDED" },
  { bookId: 102, title: "구 버전 세계지리부도", author: "지리교육연구소", publisher: "한국지도", isbn: "978-1111100002", kdcCode: "959", kdcClass: "9", callNumber: "959-지66ㅈ", coverUrl: null, status: "DISCARDED" },
  { bookId: 103, title: "낡은 실용 영어회화", author: "김민수", publisher: "어학당", isbn: "978-1111100003", kdcCode: "740", kdcClass: "7", callNumber: "740-김56ㅅ", coverUrl: null, status: "DISCARDED" },
  { bookId: 104, title: "2005 증권시장 개론", author: "재무연구회", publisher: "경제신문사", isbn: "978-1111100004", kdcCode: "327", kdcClass: "3", callNumber: "327-재55ㅈ", coverUrl: null, status: "DISCARDED" },
];

// 목업 상태에서는 상한 대비 여유가 있는 초기값(진행률 41%)으로 시작해, 남은 처리 가능 건수와 경고 배지가 자연스럽게 보이도록 함
const MOCK_CAP_RATIO = 0.07;
const MOCK_CAP_COUNT = Math.floor(MOCK_TOTAL_BOOKS * MOCK_CAP_RATIO); // 3,150
const MOCK_DISCARDED_COUNT = 1290;

export const getDiscardedBooksApiMock = (): Promise<DiscardedBookListData> =>
  mockDelay({
    books: MOCK_DISCARDED_BOOKS,
    quota: {
      totalBooks: MOCK_TOTAL_BOOKS,
      discardedCount: MOCK_DISCARDED_COUNT,
      capCount: MOCK_CAP_COUNT,
      capRatio: MOCK_CAP_RATIO,
      remaining: Math.max(0, MOCK_CAP_COUNT - MOCK_DISCARDED_COUNT),
      capReached: MOCK_DISCARDED_COUNT >= MOCK_CAP_COUNT,
    },
  });
