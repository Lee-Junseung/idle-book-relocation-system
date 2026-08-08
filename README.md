# 도서관 통합관리 시스템 (Frontend)

수원시 공공도서관 통합관리 시스템의 사서 전용 프론트엔드입니다.

> **상태: 미완성** — 아이디/비밀번호 찾기 등 일부 기능은 UI만 존재하며, 알려진 확인 필요 항목은 각 섹션 하단에 정리되어 있습니다.

## 시작하기

```bash
npm install

# .env, .env.local을 프로젝트 루트에 생성 (아래 "환경변수 설정" 참고)

npm run dev       # 개발 서버 실행
npm run build     # 프로덕션 빌드
npm run preview   # 빌드 결과 로컬 미리보기
```

> 위 스크립트 이름은 Vite 프로젝트의 일반적인 구성 기준이며, 실제 `package.json`에 정의된 스크립트명과 다를 수 있으니 실행 전 한 번 확인하세요.

## 폴더 구조

```
src/
├── api/                        # 백엔드 API 연동 레이어. 도메인별로 xxx.ts(실제 API 호출)와
│   │                             # xxxMock.ts(mock 구현)가 1:1로 쌍을 이루고, VITE_USE_MOCK 값에 따라 자동 분기된다.
│   ├── client.ts                 # 공통 fetch 래퍼(apiGet/apiPost/apiPut/apiPostWithAuthHeader), USE_MOCK 플래그,
│   │                               # Authorization 헤더 자동 첨부, 401 처리(setUnauthorizedHandler), ApiError, mockDelay/hashCode
│   ├── session.ts                 # 로그인 세션(accessToken 포함) 저장/조회/삭제 (localStorage)
│   ├── auth.ts / authMock.ts      # 로그인/회원가입 API (mock 테스트 계정: admin/admin)
│   ├── dashboard.ts / dashboardMock.ts        # 대시보드(개요) API — 6종 지표를 병렬 조회
│   ├── checklists.ts / checklistsMock.ts      # 파손 심사 대기열(WearQueuePage) — 점검 대상 목록 조회, 점검 리스트 등록,
│   │                               # 유휴화 점수 재산정. mapToBook/buildChecklistRegisterRequest 등 화면-API 매핑 함수 포함
│   ├── resultChecklist.ts / resultChecklistMock.ts  # 점검 "완료 결과" 관련(WearManagePage) — 완료 목록/상세 조회,
│   │                               # 점검 결과 수정, 점검 항목 마스터, 폐기/이관/보존 결정 확정(단건·일괄), 월별 대출 추이,
│   │                               # ApiEnvelope<T> 공통 응답 래퍼 및 damage(1~5)↔totalScore 변환 유틸(scoreToDamage 등)도 여기 정의
│   ├── transfers.ts / transfersMock.ts        # 이관(상호대차) 추천 목록 조회·실행 (RelocationPage)
│   └── discardedBooks.ts / discardedBooksMock.ts  # 폐기 확정 도서 목록 + 연간 폐기 상한 현황 (DiscardedBooksPage)
│
├── components/                 # 여러 페이지가 공유하는 프레젠테이션 컴포넌트
│   ├── Card.tsx                    # 기본 카드 컨테이너
│   ├── SectionHeader.tsx           # 섹션 타이틀 + 부제 + 우측 액션 슬롯
│   ├── MetricCard.tsx              # 대시보드 상단 지표(값/트렌드/아이콘) 카드
│   ├── DamageDot.tsx / DamageTooltipCell.tsx   # 훼손도(1~5) 시각화 — 점+라벨, 점+라벨+테이블 셀용 분수 표기
│   ├── ScoreStackBar.tsx           # 이관 매칭 스코어(M) 막대그래프 + 클릭/호버 시 산정 근거 툴팁 (RelocationPage)
│   ├── IdleScoreBar.tsx            # 유휴화 점수 막대그래프 + 산정 근거 툴팁 (WearQueuePage). 산식: U_i = Wage(KDC)×Sage(i) + Wloan(KDC)×Sloan(i)
│   ├── ConfirmModal.tsx            # 폐기/이관/보존 등 되돌릴 수 없는 작업 실행 전 확인 모달 (공용)
│   ├── TransferExecuteModal.tsx    # RelocationPage 전용 — 이관 실행 전 확인 모달. 단건은 경로/거리/매칭 스코어를,
│   │                                 # 일괄은 대상 목록을 스크롤 리스트로 보여준 뒤 실행한다.
│   ├── InspectionChecklistModal.tsx  # WearQueuePage 전용 — 점검 15개 항목 신규 등록 모달
│   ├── ChecklistEditModal.tsx      # WearManagePage 전용 — 이미 등록된 점검 결과 수정 모달
│   ├── index.ts                    # 컴포넌트 export 모음(배럴) — IdleScoreBar는 각 페이지에서 개별 import
│   └── lib.ts                      # 공용 유틸 (withAlpha, getDotColor/getDotLabel, clampIndex/clampScore, DATA_REF_DATE,
│                                     # monthsSince, buildMonthlyLoanData, TRANSFER_SCORE_WEIGHTS 등)
│
├── constants/
│   ├── colors.ts                 # 색상 상수 (NAV, BLUE, RED, GREEN, AMBER, PURPLE, TEAL, BROWN, PIE_COLORS, DOT_COLORS/DOT_LABELS 등)
│   ├── library.ts                # 현재 배포 도서관 정보(CURRENT_LIBRARY). .env의 VITE_LIBRARY_* 값을 주입받으며, 누락 시 앱 부팅 실패
│   ├── genres.ts                 # KDC(한국십진분류법) 대분류 10종 — 서버 API 없이 프론트 상수로 고정 관리
│   └── checklistItems.ts         # 마모 점검 15개 항목(INSP_ITEMS_FLAT) 정의, 항목별 checkItemId 매핑, 평균/보정 점수 계산 유틸
│
├── pages/                       # 화면(라우트) 단위 컴포넌트. 데이터 페칭(useEffect + api/ 호출)과 렌더링을 함께 담당
│   ├── index.ts                    # pages 모듈 export 모음
│   ├── LoginPage.tsx               # 로그인/회원가입 (아이디·비밀번호 찾기는 UI만 존재, 미구현)
│   ├── OverviewPage.tsx            # 대시보드 전체 현황 — 핵심 지표 4종 · 월별 대출 추이 · 연령대 분포 · 분관 네트워크
│   ├── WearQueuePage.tsx           # 파손 심사 대기열 — 점검 미등록(DAMAGE_PENDING) 도서 검색/필터/유휴화 점수 정렬,
│   │                                 # 유휴화 재산정, 점검 15개 항목 등록
│   ├── WearManagePage.tsx          # 파손 도서 관리 — 점검 완료 도서 필터/정렬/페이지네이션, 행 확장 시 상세·월별 대출 추이 조회,
│   │                                 # 폐기/이관/보존 결정 확정(단건·일괄), 점검 결과 수정
│   ├── RelocationPage.tsx          # 이관 관리 — 이관 우선순위 큐(메인 추천 + 대안 후보) 조회, 방향(발신/수신) 필터,
│   │                                 # 개별/선택 일괄 이관 실행
│   └── DiscardedBooksPage.tsx      # 폐기 확정 도서 목록 + 도서관법 시행령 [별표 7] 제3호(연간 폐기 상한 7%) 준수 현황
│
├── styles/
│   ├── fonts.css
│   ├── index.css
│   ├── tailwind.css
│   └── theme.css
│
├── types/                       # 전역/도메인 타입 정의. api/의 같은 이름 파일과 1:1로 대응
│   ├── index.ts                    # 공용 타입 — Book, BookStatus, ScoreValue, DemandLevel(현재 미사용 — 향후 수요 등급
│   │                                 # 표시 UI를 위해 남겨둔 타입), DamageInspection, ModalConfig, Session, User,
│   │                                 # LoanHistoryPoint, PageId 등
│   ├── auth.ts                     # 로그인/회원가입 요청·응답 타입.
│   │                                 # LoginRequest는 { username, password } (프론트 상태명은 loginId이지만 전송 시 username 필드명으로 매핑됨).
│   │                                 # LoginResponse는 서버 응답 바디(message/name/email/nickname/librarianCode)에
│   │                                 # accessToken을 합친 형태 — accessToken은 응답 바디가 아니라 Authorization 응답 헤더(Bearer ...)에서 추출됨
│   ├── dashboard.ts                # 대시보드 API 응답 타입 (OverviewPage에서 사용)
│   ├── checklists.ts               # 파손 심사 대기열(WearQueuePage) API 요청·응답 타입, ChecklistErrorState
│   ├── resultChecklist.ts          # 점검 완료 결과(WearManagePage) API 요청·응답 타입. ApiEnvelope<T>({status,message,data})
│   │                                 # 공통 래퍼, BookDetailResult, ConfirmDecisionData, MonthlyLoanTrendItem 등이 여기 정의됨
│   ├── transfers.ts                # 이관(RelocationPage) API 요청·응답 타입 + 화면용 뷰 모델(RelocationItem, TransferExecuteModalConfig,
│   │                                 # mapToRelocationItem 등)
│   └── discardedBooks.ts           # 폐기 도서(DiscardedBooksPage) API 요청·응답 타입 (DiscardedBookItem, DiscardQuota)
│
├── App.tsx                    # 루트 컴포넌트. 로그인 게이트, 사이드바 네비게이션(모바일 토글 지원), 헤더,
│                                 # 페이지 라우팅(overview/wear-queue/wear-manage/relocation/discarded), 401 콜백 등록,
│                                 # books/inspections 전역 상태(WearQueuePage ↔ WearManagePage 공유) 보관
├── main.tsx                   # 앱 엔트리 포인트 (ReactDOM 렌더링)
└── vite-env.d.ts               # Vite 환경변수 타입 선언
```

### 폴더별 역할

- **`api/`**: 실제 백엔드 API 호출과 mock 데이터를 분기하는 레이어. `.env.local`의 `VITE_USE_MOCK` 값에 따라 자동 전환됨. 로그인 성공 후 발급되는 `accessToken`도 이 레이어(`client.ts`)에서 모든 요청에 자동으로 실어 보낸다. 도메인별로 `xxx.ts`(실제/분기 로직)와 `xxxMock.ts`(mock 데이터)가 쌍을 이룬다.
- **`components/`**: 여러 페이지에서 공유하는 프레젠테이션 컴포넌트.
- **`constants/`**: 배포 환경(도서관 정보)과 디자인 토큰(색상), 점검 항목·장르 분류 등 앱 전역 상수.
- **`pages/`**: 라우트 단위 화면. 데이터 페칭 로직(`useEffect` + `api/` 함수 호출)과 UI 렌더링을 담당.
- **`types/`**: API 응답 및 도메인 모델 타입 정의. 도메인별로 파일을 분리하며, `api/`의 같은 이름 파일과 1:1로 대응한다.

> 참고: 화면 개발 초기에 쓰던 목업 전용 `data/` 폴더는 API 연동이 끝나면서 제거되었고, 지금은 각 도메인의 `xxxMock.ts`가 그 역할을 대신한다. 마찬가지로 초기 프로토타입 단계에서 쓰이다 실제 화면에서는 채택되지 않은 `ScoreDots.tsx`(도트 5개 시각화)와 `ChartTooltip.tsx`(recharts 공용 커스텀 툴팁)도 이후 정리되었다 — 훼손도 표기는 `DamageDot`/`DamageTooltipCell`로, 차트 툴팁은 각 페이지에서 recharts `Tooltip`의 `content` prop에 인라인 렌더 함수를 넘기는 방식으로 대체되어 있다.

## 환경변수 설정

```.env
# .env — 배포 인스턴스(도서관)를 식별하는 정보. 도서관마다 별도 배포하는 구조라 도서관을 바꾸려면
# 코드가 아니라 이 값만 바꾸면 된다. (constants/library.ts에서 필수값으로 검증함 — 누락 시 앱 부팅 실패)
VITE_LIBRARY_ID=lib-buksuwon-001
VITE_LIBRARY_NAME=북수원도서관
VITE_LIBRARY_ADDRESS=경기도 수원시 장안구 정조로 944
VITE_LIBRARY_SHORT_ADDRESS=경기도 수원시 장안구
```

```.env
# .env.local — API 통신 모드
# true로 설정하면 Mock 데이터 사용, false로 바꾸면 실제 API 호출
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:8080
```

## 전체 화면 구조 — App.tsx

- 로그인 전(`session === null`)에는 `LoginPage`만 렌더링하는 게이트 역할을 한다.
- 로그인 후에는 좌측 사이드바(핀 고정/토글 가능, 리사이즈 시 자동 접힘) + 상단 헤더(현재 위치·데이터 기준일) + 본문 페이지로 구성된 레이아웃을 렌더링한다.
- 사이드바 메뉴 5개가 `PageId`(`"overview" | "wear-queue" | "wear-manage" | "relocation" | "discarded"`)와 1:1로 매핑되어 있으며, `page` 상태로 본문 컴포넌트를 스위칭한다.
- `books`/`inspections` 상태는 `App.tsx`에 있고 `WearQueuePage`·`WearManagePage` 양쪽에 props로 내려가 공유된다 (파손 심사 대기열에서 점검을 등록하면 관리 화면 쪽 데이터에도 영향을 준다). `RelocationPage`·`DiscardedBooksPage`는 자체적으로 API를 호출해 상태를 들고 있어 별도 props가 필요 없다.
- 어떤 화면에서 API 호출 중 401을 받든 `api/client.ts`의 `setUnauthorizedHandler` 콜백을 통해 자동으로 세션이 비워지고 로그인 화면으로 돌아간다.

## 인증(Auth) 흐름 — LoginPage

1. 사용자가 `LoginPage`에서 아이디/비밀번호를 입력하고 제출하면 `api/auth.ts`의 `loginApi`가 호출됨. 이때 요청 바디는 `{ username, password }` — 프론트 화면 상의 "아이디" 입력값(`loginId`)이 서버로는 `username` 필드명으로 전송됨.
2. `VITE_USE_MOCK` 값에 따라 `api/authMock.ts`(mock) 또는 `POST /api/users/login`(실제 API) 중 하나로 분기.
3. 로그인 성공 시 서버는 응답 **바디**에 `message, name, email, nickname, librarianCode`를 담아 보내고, **`accessToken`은 응답 바디가 아니라 `Authorization` 응답 헤더(`Bearer ...`)로 내려줌.** `api/client.ts`의 `apiPostWithAuthHeader()`가 이 헤더에서 토큰을 추출하고, `api/auth.ts`의 `loginApi()`가 응답 바디와 토큰을 합쳐 하나의 `LoginResponse` 객체로 반환하므로 `LoginPage` 입장에서는 `res.accessToken`을 그대로 쓰면 됨.
4. `LoginPage`가 이 `LoginResponse`를 `Session` 객체로 조립해 `api/session.ts`의 `saveSession`으로 `localStorage`에 저장.
   - `librarianId`(응답의 `librarianCode`)는 점검 리스트 등록 API(`ChecklistRegisterRequest.librarianCode`) 및 폐기/이관/보존 결정 확정 API에 그대로 사용됨.
   - `accessToken`은 이후 모든 API 요청에 사용됨.
5. 저장된 세션은 `App.tsx`가 앱 시작 시 `loadSession()`으로 읽어와 로그인 상태를 유지 (새로고침해도 재로그인 불필요).
6. `api/client.ts`의 `apiGet`/`apiPost`/`apiPut`은 요청마다 `loadSession()`으로 `accessToken`을 꺼내 `Authorization: Bearer <token>` 헤더를 자동으로 첨부함. 별도로 각 API 함수에서 토큰을 신경 쓸 필요 없음.
7. **401 응답을 받으면 자동으로 로그아웃 처리됨.** `client.ts`가 응답 상태코드 401을 감지하면 `session.ts`의 `logout()`(localStorage 세션 삭제)을 호출하고, `App.tsx`가 등록해둔 콜백(`setUnauthorizedHandler`)을 실행해 화면 상태의 `session`도 `null`로 초기화 — 결과적으로 어느 페이지에서 API 호출 중 401을 받아도 자동으로 로그인 화면으로 돌아감.
8. 로그아웃 버튼(`App.tsx` 사이드바)을 직접 눌러도 동일하게 `logout()` + `setSession(null)` 처리.
9. 아이디 저장(`localStorage`의 `lib_remember_id`) 로직은 남아있으나, 이를 켜고 끄는 체크박스 UI는 현재 주석 처리되어 있어 화면에는 노출되지 않는다 — 이전에 저장된 아이디가 있으면 자동으로 불러오기만 한다.

### 알려진 제약 / 확인 필요 항목

- 아이디/비밀번호 찾기: 로그인 폼에 텍스트(UI)만 있고 실제 기능은 미구현.
- 토큰 갱신(refresh) 플로우 없음: `accessToken` 만료 시 재로그인만 가능 (로그인 응답에 `refreshToken` 필드가 없음). 백엔드에 별도 refresh 엔드포인트가 있는지, `accessToken` 만료 시간이 얼마인지 확인 필요 — 있다면 자동 갱신 로직 추가 가능.
- **API 응답이 `{status, message, data}` 형태로 감싸져 오는 엔드포인트와, 감싸지 않고 그대로 오는(unwrapped) 엔드포인트가 섞여 있음.** `api/` 각 파일의 함수별 주석에 어느 쪽인지 적어뒀지만, 실제 배포 서버 응답과 사전에 공유된 API 문서가 다른 경우가 실제로 확인된 바 있으므로(월별 대출 추이 필드명, 결정 확정 단건 API 래핑 여부 등) 신규 엔드포인트를 연동하거나 기존 문서를 신뢰하기 전에 반드시 실제 Network 응답으로 한 번 교차 검증할 것.

## 대시보드 흐름 — OverviewPage

사이드바 "개요" 메뉴에 해당하는 첫 화면. **핵심 지표 4종 + 월별 대출 추이 차트 + 지역 연령대 분포 + 수원시 도서관 네트워크 목록**을 한 화면에서 보여준다.

### 데이터 페칭 흐름

1. `OverviewPage` 마운트 시 `useEffect`에서 `loadDashboard()` 실행.
2. `Promise.all`로 6개 API를 **병렬 호출**:
   `getIdleBooksCount(libraryId)` · `getDamagePendingCount(libraryId)` · `getTransferPendingCount()` · `getMonthlyLoans()` · `getUsersDistribution()` · `getLibraryNetworkDistances()` — 전부 `src/api/dashboard.ts`에 정의.
3. `VITE_USE_MOCK` 값에 따라 각 함수가 `api/client.ts`의 `apiGet`(실제 API) 또는 `api/dashboardMock.ts`(mock)로 분기 — Auth와 동일한 패턴.
4. 응답을 화면용 로컬 타입(`LoanTrendPoint`, `DemographicPoint`, `Branch` 등)으로 가공한 뒤 `setState`.
5. 언마운트 시 `cancelled` 플래그로 이후 `setState` 호출을 막아 레이스 컨디션을 방지.
6. 실패 시 `ApiError`와 일반 `Error`를 구분해 `DashboardErrorState`로 정규화하고 에러 화면을 렌더링 (전체 페이지 단위 로딩/에러 처리이며, 부분 실패 시에도 화면 전체가 에러로 대체됨).

### 알려진 확인 포인트

- `usersDistribution.data.ageDistribution` 접근 시 옵셔널 체이닝/기본값이 없으나, 명세서 예시에 7개 키가 모두 있어 정상 케이스는 문제없음. 다만 안전장치로 방어 코드를 추가하면 더 견고해짐. 방어 코드가 없는 상태로 백엔드를 신뢰하고 있음 (우선순위 낮음).
- `Promise.all` 특성상 6개 API 중 하나만 실패해도 전체가 에러 화면으로 대체됨. 재시도(refetch) 버튼은 없음 (우선순위 낮음, UX 개선 사항).
- `dashboardMock.ts`의 `MOCK_DATA_BY_LIBRARY`는 현재 `CURRENT_LIBRARY.id`(북수원도서관) 하나만 등록되어 있음. 새 도서관을 mock 모드로 개발할 때 항목을 추가하지 않으면 자동으로 북수원 데이터로 fallback됨 — 에러는 안 나지만 헷갈릴 수 있으므로 **두 번째 도서관을 mock 모드로 개발할 때만 기억하면 되는 항목** (우선순위 낮음, 지금 당장 손댈 필요 없음).

## 파손 도서 관리 흐름 — WearQueuePage → WearManagePage

파손 심사는 두 화면에 걸쳐 진행된다. 두 화면 모두 `App.tsx`가 들고 있는 전역 `books`/`setBooks`를 props로 받아 공유한다.

### 1. WearQueuePage — 파손 심사 대기열

- `api/checklists.ts`의 `getChecklistListApi`로 **지점 내 점검 미등록(`DAMAGE_PENDING`) 도서**를 검색어(`keyword`, 300ms 디바운스)/장르(`genre`)/유휴화 점수 정렬(`sortOrder`) 조건과 함께 서버 페이지네이션(10건)으로 조회한다. 검색·필터·정렬을 모두 서버로 전달해 "현재 페이지 10건 안에서만 필터링되는" 문제를 방지한다. 제목/장르 정렬은 백엔드가 지원하지 않아 유휴화 점수 정렬만 지원한다.
- 조회 결과는 페이지/검색어/장르/정렬 조합을 키로 하는 모듈 스코프 캐시(`queueListCache`)에 stale-while-revalidate 방식으로 저장돼, 다른 페이지에 갔다가 돌아와도 이전 화면이 먼저 보이고 최신 응답이 오면 덮어쓴다.
- **유휴화 도서 새로고침** 버튼: `classifyIdleBooksApi()`(`POST /api/checklists/idle-classify`, 서버 측 유휴화 점수 재산정)를 먼저 호출하고, 성공하면 캐시를 비운 뒤 1페이지부터 다시 조회한다.
- 도서를 선택해 `InspectionChecklistModal`에서 15개 항목(`constants/checklistItems.ts`)을 채점하면 `registerChecklistApi`(`POST /api/checklists/results`)로 점검 리스트가 등록된다.
- 등록 성공 시: 전역 `inspections`/`books`(damage 필드)를 갱신하고, **해당 도서를 현재 화면 목록에서만 즉시 제거한다** (예전에는 등록 후 자동으로 WearManagePage로 이동시켰으나, 이 화면에 계속 머무르는 쪽으로 변경됨 — 목록에서 제거하지 않고 재조회만 하면 등록 직후에도 화면에 남아있어 재클릭 시 "이미 등록된 점검 결과입니다" 에러로 이어질 수 있어 즉시 필터링하는 방식을 씀).

### 2. WearManagePage — 파손 도서 관리

- `api/resultChecklist.ts`의 `getCompletedChecklistsApi`로 점검이 완료된 도서 목록을 조회하고, 장르/훼손도(damage)/검색 조건으로 필터링·정렬(클라이언트 사이드)한 뒤 10건씩 페이지네이션한다. 이관승인/폐기승인 처리가 완료된 도서는 목록에서 완전히 제외되며(보존결정은 유지), 필터·정렬 변경으로 결과 수가 줄어 현재 페이지가 범위를 벗어나면 자동으로 보정된다.
- 행을 펼치면(`panelBook`) 두 API를 동시에 호출한다:
  - `getBookDetailApi` — 점검 상세(항목별 통과 여부·점수, 총점, 담당자, 점검일)
  - `getMonthlyLoanTrendApi` — 최근 12개월 월별 대출 추이 (막대/라인 차트)
- 점검 항목 마스터(`getCheckItemsApi`, `checkItemId → maxScore`)도 함께 조회해 화면 내부 척도(1~5)를 항목별 실제 만점으로 환산한다. 이 도메인은 15문항 모두 5점 만점 고정이라 조회 실패 시에도 화면 표시·수정·저장은 정상 동작하며(폴백 만점 5가 실제 값과 항상 같음), 콘솔 경고만 남는다.
- **점검 수정**: `ChecklistEditModal`에서 항목 점수를 다시 입력하면 `updateChecklistResultApi`(`PUT /api/checklists/results/{resultBatchId}`)로 저장한다. 통과 판정은 화면 척도(1~5) 원점수 기준 2점 이하를 통과로 보되, 서버에는 항목별 만점으로 환산된 `itemScore`를 전송한다.
- **폐기/이관/보존 결정 확정**: `confirmDecisionForBooks`가 대상 건수에 따라 API를 나눠 호출한다.
  - 1건 이하 → `confirmDecisionApi` (`PUT /api/checklists/results/{resultBatchId}/decision`, 단건)
  - 2건 이상 → `confirmDecisionsApi` (`PUT /api/checklists/results/decisions`, 일괄 — 요청 1번으로 처리)
  - 성공한 건은 서버가 응답으로 내려준 `decidedAt`을 그대로 화면에 반영하되(클라이언트가 보낸 날짜보다 서버 값을 신뢰), 응답에 `decidedAt`이 없는 예외 상황에 대비해 클라이언트가 보낸 날짜(`decidedDate`)로 대체하는 방어 코드가 들어가 있다.
  - 실패/스킵(점검 결과 배치 ID가 없는 도서)은 개수를 집계해 모달로 안내한다.
  - 사서 식별 코드(`librarianCode`)가 없으면 "누가 수정/결정했는지" 알 수 없는 상태로 서버에 요청을 보내지 않도록, 저장 전에 미리 막는다 (WearQueuePage의 점검 등록도 동일).

### 알려진 확인 포인트

- `confirmDecisionApi`(단건 결정 확정)는 `{status, message, data}`로 감싸진 응답을 반환한다 — 실제 응답 기준으로 확인 완료. 문서상 언래핑 없이 온다고 적혀 있던 적이 있었으나 오기였으므로, 유사 엔드포인트를 새로 붙일 때는 문서보다 실제 Network 응답을 우선 신뢰할 것.
- `getMonthlyLoanTrendApi` 응답의 각 항목 필드명은 `month`("YY.MM" 문자열) / `v`(건수)이며, 서버가 이미 오래된 달 → 최근 달 순으로 정렬해 내려준다. 배열 길이가 항상 12개는 아니며(스냅샷 데이터 부족 시 더 적거나 0개), 프론트에서는 `month` 누락 항목만 방어적으로 걸러낸다.
- `getBookDetailApi`(도서 상세)는 `{status,message,data}` 래핑 없이 객체를 그대로 반환한다 (예외적으로 unwrapped — 확인 완료). 점검 이력이 아예 없는 도서를 조회하면 서버 에러(현재는 500)가 발생할 수 있다.

## 이관 관리 흐름 — RelocationPage

- `getTransferListApi`(`GET /api/transfers?status=PENDING,IN_TRANSIT&page=&size=`)로 이관 우선순위 큐를 서버 페이지네이션(10건)으로 조회한다. 상단에는 이번달 총 대기/발신/수신 건수 요약(`summary`)을 보여준다.
- 목록의 각 행은 메인 추천 1건 + 대안 후보(`alternatives`) 여러 건으로 구성되며, 행을 펼치면 대안 후보들이 같은 셀 레이아웃(`RelocationRowCells`)으로 아래에 나열된다. 서버가 메인 추천/대안 후보 모두에 `scoreDetails`를 내려주므로 두 경우 모두 동일한 타입(`RelocationCandidate`)으로 다룬다.
- 매칭 스코어(M)는 `ScoreStackBar`로 시각화하며, 거리 감쇄(30%) + 장르 수요도(25%) + 수급 불일치 해소(25%) + 공간 효율성(20%) 가중합으로 산출된 값이다 (`components/lib.ts`의 `TRANSFER_SCORE_WEIGHTS`는 이 값을 나타내는 참고용 상수 — 서버가 `scoreDetails`를 이미 내려주므로 프론트에서 점수를 역산하는 데는 쓰이지 않는다).
- 이관 실행 전 `TransferExecuteModal`로 대상(단건 또는 선택된 다건)을 한 번 더 확인시킨다. 실행 확정 시 같은 세트(메인 추천 + 대안 후보)의 나머지 후보는 응답을 기다리지 않고 "완료" 상태·버튼 숨김으로 먼저 낙관적으로 반영한다. 방금 실행한 세트는 이후 재조회 응답(`status=PENDING,IN_TRANSIT` 필터)에서 통째로 빠질 수 있는데, 이 경우에도 화면에서 바로 사라지지 않도록 실행된 ID 집합(`executedIdSet`)을 재조회 시 함께 전달해 결과에 없어도 보존한다.
- 방향(발신/수신) 필터, 개별 이관 실행, 체크박스 다건 선택 후 일괄 이관 실행을 지원한다. 실행은 `executeTransferApi`(`POST /api/transfers/{recommendationId}/execute`, 요청 바디 없음)를 대상 건수만큼 순차 호출(`Promise.allSettled`)한 뒤, 성공/실패 여부와 무관하게 `fetchQueue`로 최신 상태를 다시 조회한다 (백엔드에 일괄 실행 전용 엔드포인트가 없어 프론트에서 순차 호출로 처리).

## 폐기 도서 현황 — DiscardedBooksPage

- `getDiscardedBooksApi`(`GET /api/checklists/discarded`, `{status,message,data}` 래핑)로 폐기 확정된 도서 목록과 연간 폐기 상한 현황(`quota`)을 함께 조회한다.
- `quota`는 도서관법 시행령 [별표 7] 제3호(전체 장서의 7%)를 기준으로 계산된 값이며, 진행률에 따라 여유(초록)/상한 임박(주황, 85% 이상)/상한 도달(빨강) 3단계 배지로 안내한다. 상한 도달 시 신규 폐기 확정은 서버에서 거부된다는 안내 문구를 보여주지만 실제 차단 로직은 서버가 담당한다.
- 제목/저자/ISBN 검색과 클라이언트 사이드 페이지네이션(10건)만 지원하며, 장르는 `kdcClassToGenre`(백엔드 `convertKdcToGenre`와 동일 규칙: KDC 대분류 첫 자리 → 장르명)로 KDC 코드에서 변환해 표시한다.

## 공용 컴포넌트 메모

- **`ConfirmModal`**: 폐기/이관/보존 등 되돌릴 수 없는 작업을 실행하기 전에 확인받는 공용 모달. `ModalConfig` 타입으로 제목/본문/상세/확인 버튼 라벨·색상/아이콘 등을 주입받는다.
- **`TransferExecuteModal`**: `ConfirmModal`과 별개로 RelocationPage에서만 쓰는 이관 실행 확인 모달. 단건 실행 시에는 경로·거리·매칭 스코어 표를 그대로 재사용해 보여주고, 일괄 실행 시에는 대상 목록을 스크롤 가능한 리스트로 보여준다. 폐기 등 파괴적 작업(`ConfirmModal`의 RED 경고)과 구분되도록 이관은 "운영/조율" 성격의 주의 문구를 AMBER로 표시한다.
- **`InspectionChecklistModal` vs `ChecklistEditModal`**: UI는 비슷하지만 용도가 다르다. 전자는 WearQueuePage에서 **신규 점검 등록**(초기값이 세션 내 로컬 `inspections` 상태에만 있을 수 있음)에, 후자는 WearManagePage에서 **이미 등록된 점검 결과 수정**(서버에서 받아온 상세값이 초기값)에 쓰인다.
- **`IdleScoreBar` / `ScoreStackBar`**: 각각 유휴화 점수(WearQueuePage)와 이관 매칭 스코어(RelocationPage)를 막대그래프 + 산정 근거 툴팁으로 보여주는 비슷한 역할의 컴포넌트지만, 도메인이 달라 별도 컴포넌트로 분리돼 있다.
- **`DamageDot` / `DamageTooltipCell`**: 둘 다 훼손도(1~5)를 점(dot)+라벨로 표시하지만, 후자는 테이블 셀에서 `(3/5)` 같은 분수 표기를 함께 보여주기 위한 변형이다. 값이 0이거나 범위를 벗어나면 `components/lib.ts`의 `getDotColor`/`getDotLabel`이 중립색/빈 라벨로 안전하게 처리한다.
- **`components/lib.ts`**: `withAlpha`(hex+투명도 조합), `getDotColor`/`getDotLabel`(훼손도 1~5 → 색상/라벨, 범위 밖 값 방어), `clampIndex`/`clampScore`, `DATA_REF_DATE`(헤더의 "데이터 기준일" 표시 및 마모 점검·이관 판단 기준일 계산에 사용), `monthsSince`, `buildMonthlyLoanData`(월별 대출량 추정 mock 데이터 생성) 등 여러 컴포넌트가 공유하는 유틸을 모아둔다.