# 도서관 통합관리 시스템 (Frontend)

수원시 공공도서관 통합관리 시스템의 사서 전용 프론트엔드입니다.

## 폴더 구조

\```
src/
├── api/                        # 백엔드 API 연동 레이어
│   ├── client.ts                # 공통 fetch 래퍼, USE_MOCK 플래그
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
│   ├── lib.ts                    # 컴포넌트 공용 유틸 함수
│   ├── MetricCard.tsx
│   ├── ScoreDots.tsx
│   ├── ScoreStackBar.tsx
│   └── SectionHeader.tsx
│
├── constants/
│   └── colors.ts                 # 색상 상수 (NAV, BLUE, RED 등)
│
├── data/                        # Mock 데이터 (API 연동 전 임시 데이터)
│   ├── auth.ts                    # 로그인/회원가입/계정찾기 mock 로직
│   ├── bookDetails.ts              # 도서 상세 정보 mock
│   ├── books.ts                    # 도서 목록 mock
│   ├── branches.ts                 # 분관 네트워크 mock
│   ├── damageInspections.ts         # 파손 심사 mock
│   ├── index.ts                    # data 모듈 export 모음
│   ├── loanTrend.ts                # 월별 대출 추이 mock
│   ├── relocationQueue.ts           # 이관 검토 대기열 mock
│   ├── seed.ts                     # 초기 시드 데이터
│   └── wearUtils.ts                # 마모도 계산 유틸
│
├── pages/                       # 화면 단위 페이지 컴포넌트
│   ├── index.ts                    # pages 모듈 export 모음
│   ├── LoginPage.tsx               # 로그인/회원가입/계정찾기
│   ├── OverviewPage.tsx            # 대시보드 전체 현황
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
│   ├── dashboard.ts                # 대시보드 API 응답 타입
│   └── index.ts                    # 공용 타입 (Session, User 등)
│
├── App.tsx                    # 루트 컴포넌트, 라우팅/레이아웃 진입점
├── main.tsx                   # 앱 엔트리 포인트 (ReactDOM 렌더링)
└── vite-env.d.ts               # Vite 환경변수 타입 선언
\```

### 폴더별 역할

- **`api/`**: 실제 백엔드 API 호출과 mock 데이터를 분기하는 레이어. `.env.local`의 `VITE_USE_MOCK` 값에 따라 자동 전환됨.
- **`components/`**: 여러 페이지에서 공유하는 프레젠테이션 컴포넌트.
- **`data/`**: 백엔드 연동 전 화면 개발용 mock 데이터. API 연동이 끝난 페이지는 이 폴더를 직접 참조하지 않고 `api/` 레이어를 거침.
- **`pages/`**: 라우트 단위 화면. 데이터 페칭 로직(`useEffect` + `api/` 함수 호출)과 UI 렌더링을 담당.
- **`types/`**: API 응답 및 도메인 모델 타입 정의. 페이지별로 파일을 분리 (예: `dashboard.ts`).

## 환경변수 설정 (`.env.local`)

\```dotenv
# true로 설정하면 Mock 데이터 사용, false로 바꾸면 실제 API 호출
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:8080
\```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
