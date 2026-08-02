// 점검(Checklist) 관련 Mock API 클라이언트
// checklistApi.ts 와 동일한 함수 시그니처를 제공하므로, import 경로만 바꿔서
// 백엔드 없이 화면 개발/테스트를 진행할 수 있습니다.
//
//   import * as checklistApi from "../api/checklistApiMock";

import {
  ChecklistApiError,
  CompletedChecklistListResponse,
  BookDetailResult,
  ChecklistHistoryEntry,
  UpdateChecklistResultRequest,
  UpdateChecklistResultData,
  CreateCheckItemRequest,
  CheckItemMaster,
} from "../types/checklistApi";

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

// 존재하지 않는 것으로 취급할 테스트용 ID들 (500/미존재 케이스 재현용)
const NON_EXISTENT_BOOK_IDS = new Set([999999]);
const NON_EXISTENT_RESULT_BATCH_IDS = new Set([999999]);

const MOCK_ITEMS: CompletedChecklistListResponse = [
  {
    resultBatchId: 1,
    bookId: 1,
    title: "어린왕자",
    author: "생텍쥐페리",
    publisher: "문학동네",
    callNumber: "813.6-생72ㅇ",
    coverUrl: "https://picsum.photos/seed/book1/200/280",
    checkedDate: "2026-08-01",
    librarianName: "LIB001",
    totalScore: 80,
    status: "IN_PROGRESS",
  },
  {
    resultBatchId: 2,
    bookId: 2,
    title: "데미안",
    author: "헤르만 헤세",
    publisher: "민음사",
    callNumber: "853.6-헤44ㄷ",
    coverUrl: "https://picsum.photos/seed/book2/200/280",
    checkedDate: "2026-07-28",
    librarianName: "LIB002",
    totalScore: 35,
    status: "IDLE",
  },
  {
    resultBatchId: 3,
    bookId: 3,
    title: "1984",
    author: "조지 오웰",
    publisher: "민음사",
    callNumber: "843-오96일",
    coverUrl: "https://picsum.photos/seed/book3/200/280",
    checkedDate: "2026-07-20",
    librarianName: "LIB001",
    totalScore: 92,
    status: "DISCARDED",
  },
];

const MOCK_DETAILS: Record<number, BookDetailResult> = {
  1: {
    resultBatchId: 1,
    checkedDate: "2026-08-01",
    librarianCode: "LIB001",
    totalScore: 80,
    bookInfo: {
      bookId: 1,
      title: "어린왕자",
      author: "생텍쥐페리",
      publisher: "문학동네",
      callNumber: "813.6-생72ㅇ",
      coverUrl: "https://picsum.photos/seed/book1/200/280",
      status: "IN_PROGRESS",
    },
    checkResults: [
      { checkItemId: 1, title: "표지 찢어짐", isPassed: false, itemScore: 5, note: "30페이지 낙서있음" },
      { checkItemId: 2, title: "책등 파손", isPassed: true, itemScore: 0, note: "" },
      { checkItemId: 3, title: "페이지 낙서", isPassed: false, itemScore: 3, note: "형광펜 밑줄 다수" },
    ],
  },
  2: {
    resultBatchId: 2,
    checkedDate: "2026-07-28",
    librarianCode: "LIB002",
    totalScore: 35,
    bookInfo: {
      bookId: 2,
      title: "데미안",
      author: "헤르만 헤세",
      publisher: "민음사",
      callNumber: "853.6-헤44ㄷ",
      coverUrl: "https://picsum.photos/seed/book2/200/280",
      status: "IDLE",
    },
    checkResults: [
      { checkItemId: 1, title: "표지 찢어짐", isPassed: true, itemScore: 0, note: "" },
      { checkItemId: 2, title: "책등 파손", isPassed: true, itemScore: 0, note: "" },
    ],
  },
  3: {
    resultBatchId: 3,
    checkedDate: "2026-07-20",
    librarianCode: "LIB001",
    totalScore: 92,
    bookInfo: {
      bookId: 3,
      title: "1984",
      author: "조지 오웰",
      publisher: "민음사",
      callNumber: "843-오96일",
      coverUrl: "https://picsum.photos/seed/book3/200/280",
      status: "DISCARDED",
    },
    checkResults: [
      { checkItemId: 1, title: "표지 찢어짐", isPassed: false, itemScore: 5, note: "표지 완전 분리" },
      { checkItemId: 2, title: "책등 파손", isPassed: false, itemScore: 5, note: "책등 갈라짐" },
    ],
  },
};

const MOCK_HISTORY: Record<number, ChecklistHistoryEntry[]> = {
  1: [
    {
      resultBatchId: 1,
      bookId: 1,
      librarianCode: "LIB001",
      checkedDate: "2026-08-01",
      totalScore: 80,
      items: [
        {
          checkItemId: 1,
          title: "표지 찢어짐",
          category: "COVER",
          description: "표지 손상 여부 점검",
          isPassed: false,
          note: "30페이지 낙서있음",
        },
      ],
    },
  ],
};

const MOCK_CHECK_ITEMS: CheckItemMaster[] = [
  { id: 1, title: "표지 찢어짐", category: "COVER", description: "표지 손상 여부 점검", maxScore: 5 },
  { id: 2, title: "책등 파손", category: "COVER", description: "책등 손상 여부 점검", maxScore: 5 },
  { id: 3, title: "페이지 낙서", category: "BOOK", description: "본문 낙서/훼손 여부 점검", maxScore: 5 },
];

/** 2. 점검 완료 도서 전체 목록 조회 (Mock) */
export async function getCompletedChecklists(): Promise<CompletedChecklistListResponse> {
  await delay();
  return MOCK_ITEMS;
}

/** 3. 도서 상세 조회 (Mock) — 없는 bookId는 실제 500(비JSON) 응답을 재현합니다 */
export async function getBookDetail(bookId: number): Promise<BookDetailResult> {
  await delay();
  if (NON_EXISTENT_BOOK_IDS.has(bookId) || !MOCK_DETAILS[bookId]) {
    throw new ChecklistApiError(
      "요청하신 데이터를 찾을 수 없거나 서버에서 오류가 발생했습니다. (존재하지 않는 항목일 수 있습니다)",
      "NOT_FOUND_LIKELY",
      500
    );
  }
  return MOCK_DETAILS[bookId];
}

/** 4. 도서 점검 전체 이력 리스트 조회 (Mock) */
export async function getBookHistory(bookId: number): Promise<ChecklistHistoryEntry[]> {
  await delay();
  return MOCK_HISTORY[bookId] ?? [];
}

/** 5. 점검 결과 수정 (Mock) — 없는 resultBatchId는 500(비JSON) 응답을 재현합니다 */
export async function updateChecklistResult(
  resultBatchId: number,
  body: UpdateChecklistResultRequest
): Promise<UpdateChecklistResultData> {
  await delay();
  if (NON_EXISTENT_RESULT_BATCH_IDS.has(resultBatchId)) {
    throw new ChecklistApiError(
      "요청하신 데이터를 찾을 수 없거나 서버에서 오류가 발생했습니다. (존재하지 않는 항목일 수 있습니다)",
      "NOT_FOUND_LIKELY",
      500
    );
  }
  const totalScore = body.checkResults.reduce((sum, r) => sum + r.itemScore, 0);
  return { resultBatchId, totalScore, updatedAt: new Date().toISOString() };
}

/** 6. 점검 항목(CheckItem) 등록 (Mock) */
export async function createCheckItem(
  body: CreateCheckItemRequest
): Promise<{ checkItemId: number }> {
  await delay();
  const nextId = MOCK_CHECK_ITEMS.length + 1;
  MOCK_CHECK_ITEMS.push({ id: nextId, ...body });
  return { checkItemId: nextId };
}

/** 7. 점검 항목(CheckItem) 전체 조회 (Mock) */
export async function getCheckItems(): Promise<CheckItemMaster[]> {
  await delay();
  return MOCK_CHECK_ITEMS;
}