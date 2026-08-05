# 도서관 통합관리 시스템 (Frontend)

수원시 공공도서관 통합관리 시스템의 사서 전용 프론트엔드입니다. -미완성

## 폴더 구조

```
src/
├── api/                        # 백엔드 API 연동 레이어
│   ├── client.ts                # 공통 fetch 래퍼, USE_MOCK 플래그, Authorization 헤더 자동 첨부, 401 처리,
│   │                             # 로그인 응답 헤더(Authorization)에서 accessToken을 추출하는 apiPostWithAuthHeader
│   ├── auth.ts                   # 로그인/회원가입 API 함수 (mock/실제 API 분기)
│   ├── authMock.ts               # 로그인/회원가입 mock 로직 (테스트 계정: admin/admin)
│   ├── session.ts                # 로그인 세션(accessToken 포함) 저장/조회/삭제 (localStorage)
│   ├── dashboard.ts              # 대시보드 API 함수 (mock/실제 API 분기)
│   └── dashboardMock.ts          # 대시보드 mock 데이터 (data/ 재사용)
│
├── components/                 # 재사용 가능한 UI 컴포넌트
│   ├── Card.tsx
│   ├── ChartTooltip.tsx
│   ├── ConfirmModal.tsx
│   ├── DamageDot.tsx
│   ├── DamageTooltipCell.tsx
│   ├── DemandTag.tsx
│   ├── index.ts                  # 컴포넌트 export 모음
│   ├── InspectionChecklistModal.tsx
│   ├── lib.ts                    # 컴포넌트 공용 유틸 함수 (withAlpha, getDotColor 등)
│   ├── MetricCard.tsx
│   ├── ScoreDots.tsx
│   ├── ScoreStackBar.tsx
│   └── SectionHeader.tsx
│
├── constants/
│   ├── colors.ts                 # 색상 상수 (NAV, BLUE, RED 등)
│   └── library.ts                 # 현재 배포 도서관 정보(CURRENT_LIBRARY). .env의 VITE_LIBRARY_* 값을 주입받음
│
├── pages/                       # 화면 단위 페이지 컴포넌트
│   ├── index.ts                    # pages 모듈 export 모음
│   ├── LoginPage.tsx               # 로그인/회원가입 (아이디·비밀번호 찾기는 UI만 존재, 미구현)
│   ├── OverviewPage.tsx            # 대시보드 전체 현황 (핵심 지표 · 월별 대출 추이 · 연령대 분포 · 분관 네트워크)
│   ├── RelocationPage.tsx          # 이관 관리
│   ├── WearManagePage.tsx          # 파손 도서 관리
│   └── WearQueuePage.tsx           # 파손 심사 대기열
│
├── styles/
│   ├── fonts.css
│   ├── index.css
│   ├── tailwind.css
│   └── theme.css
│
├── types/                       # 전역 타입 정의
│   ├── auth.ts                     # 로그인/회원가입 요청·응답 타입.
│   │                                 # LoginRequest는 { username, password } (프론트 상태명은 loginId이지만 전송 시 username 필드로 매핑됨).
│   │                                 # LoginResponse는 서버 응답 바디(LoginResponseBody: message/name/email/nickname/librarianCode)에
│   │                                 # accessToken을 합친 형태 — accessToken은 응답 바디가 아니라 Authorization 응답 헤더(Bearer ...)에서 추출됨 (api/client.ts, api/auth.ts 참고)
│   ├── dashboard.ts                # 대시보드 API 응답 타입 (OverviewPage에서 사용)
│   └── index.ts                    # 공용 타입 (Session, User 등)
│
├── App.tsx                    # 루트 컴포넌트, 라우팅/레이아웃 진입점, 401 콜백 등록
├── main.tsx                   # 앱 엔트리 포인트 (ReactDOM 렌더링)
└── vite-env.d.ts               # Vite 환경변수 타입 선언
```

### 폴더별 역할

- **`api/`**: 실제 백엔드 API 호출과 mock 데이터를 분기하는 레이어. `.env.local`의 `VITE_USE_MOCK` 값에 따라 자동 전환됨. 로그인 성공 후 발급되는 `accessToken`도 이 레이어(`client.ts`)에서 모든 요청에 자동으로 실어 보낸다. (로그인/회원가입: mock `api/authMock.ts`, 대시보드: mock `api/dashboardMock.ts`)
- **`components/`**: 여러 페이지에서 공유하는 프레젠테이션 컴포넌트.
- **`constants/`**: 배포 환경(도서관 정보)과 디자인 토큰(색상) 등 앱 전역 상수.
- **`data/`**: 백엔드 연동 전 화면 개발용 mock 데이터. API 연동이 끝난 페이지는 이 폴더를 직접 참조하지 않고 `api/` 레이어를 거침.
- **`pages/`**: 라우트 단위 화면. 데이터 페칭 로직(`useEffect` + `api/` 함수 호출)과 UI 렌더링을 담당.
- **`types/`**: API 응답 및 도메인 모델 타입 정의. 페이지별로 파일을 분리 (예: `auth.ts`, `dashboard.ts`).

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

## 인증(Auth) 흐름 — LoginPage

1. 사용자가 `LoginPage`에서 아이디/비밀번호를 입력하고 제출하면 `api/auth.ts`의 `loginApi`가 호출됨. 이때 요청 바디는 `{ username, password }` — 프론트 화면 상의 "아이디" 입력값(`loginId`)이 서버로는 `username` 필드명으로 전송됨.
2. `VITE_USE_MOCK` 값에 따라 `api/authMock.ts`(mock) 또는 `POST /api/users/login`(실제 API) 중 하나로 분기.
3. 로그인 성공 시 서버는 응답 **바디**에 `message, name, email, nickname, librarianCode`를 담아 보내고, **`accessToken`은 응답 바디가 아니라 `Authorization` 응답 헤더(`Bearer ...`)로 내려줌.** `api/client.ts`의 `apiPostWithAuthHeader()`가 이 헤더에서 토큰을 추출하고, `api/auth.ts`의 `loginApi()`가 응답 바디와 토큰을 합쳐 하나의 `LoginResponse` 객체로 반환하므로 `LoginPage` 입장에서는 `res.accessToken`을 그대로 쓰면 됨.
4. `LoginPage`가 이 `LoginResponse`를 `Session` 객체로 조립해 `api/session.ts`의 `saveSession`으로 `localStorage`에 저장.
   - `librarianId`(응답의 `librarianCode`)는 점검 결과 등록 API(`ChecklistRegisterRequest.librarianCode`)에 그대로 사용됨.
   - `accessToken`은 이후 모든 API 요청에 사용됨.
5. 저장된 세션은 `App.tsx`가 앱 시작 시 `loadSession()`으로 읽어와 로그인 상태를 유지 (새로고침해도 재로그인 불필요).
6. `api/client.ts`의 `apiGet`/`apiPost`는 요청마다 `loadSession()`으로 `accessToken`을 꺼내 `Authorization: Bearer <token>` 헤더를 자동으로 첨부함. 별도로 각 API 함수에서 토큰을 신경 쓸 필요 없음.
7. **401 응답을 받으면 자동으로 로그아웃 처리됨.** `client.ts`가 응답 상태코드 401을 감지하면 `session.ts`의 `logout()`(localStorage 세션 삭제)을 호출하고, `App.tsx`가 등록해둔 콜백(`setUnauthorizedHandler`)을 실행해 화면 상태의 `session`도 `null`로 초기화 — 결과적으로 어느 페이지에서 API 호출 중 401을 받아도 자동으로 로그인 화면으로 돌아감.
8. 로그아웃 버튼(`App.tsx` 사이드바)을 직접 눌러도 동일하게 `logout()` + `setSession(null)` 처리.

### 알려진 제약 / 확인 필요 항목

- 아이디/비밀번호 찾기: 로그인 폼에 텍스트(UI)만 있고 실제 기능은 미구현.
- 토큰 갱신(refresh) 플로우 없음: `accessToken` 만료 시 재로그인만 가능 (로그인 응답에 `refreshToken` 필드가 없음). 백엔드에 별도 refresh 엔드포인트가 있는지, `accessToken` 만료 시간이 얼마인지 확인 필요 — 있다면 자동 갱신 로직 추가 가능.

---

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