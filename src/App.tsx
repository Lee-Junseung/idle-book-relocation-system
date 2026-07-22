// 도서관 마모/이관 관리 대시보드의 루트 컴포넌트: 로그인 게이트, 사이드바 네비게이션(모바일 탭 토글 지원), 헤더, 페이지 라우팅(개요/마모 점검/마모 처리/이관 우선순위)을 담당한다.
import { useState } from "react";
import {
  LayoutDashboard, BookOpen, ArrowLeftRight, Bell, Settings, LogOut,
  ChevronRight, Pin, Building2, CalendarClock, ClipboardCheck, Menu,
  type LucideIcon,
} from "lucide-react";

import { NAV, RED } from "./constants/colors";
import { PageId, Session, Book, BookStatus, DamageInspection } from "./types";
import { loadSession, logout } from "./data/auth";
import { ALL_BOOKS } from "./data";
import { DAMAGE_INSPECTIONS } from "./data/damageInspections";
import { DATA_REF_DATE } from "./data/wearUtils";
import { OverviewPage, WearQueuePage, WearManagePage, RelocationPage, LoginPage } from "./pages";

// 개선: "2026-07-01"을 여기서 또 하드코딩하지 않고, data/wearUtils.ts의 DATA_REF_DATE(단일 출처)에서 파생
const DATA_AS_OF_DATE = DATA_REF_DATE.toISOString().slice(0, 10);

// 문제 3: NAV_ITEMS의 icon을 any 대신 LucideIcon으로 명시
interface NavItem {
  id: PageId;
  label: string;
  sub: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "개요", sub: "대시보드 & 통계", icon: LayoutDashboard },
  { id: "wear-queue", label: "마모 점검 대상", sub: "6개월 경과 도서", icon: CalendarClock },
  { id: "wear-manage", label: "마모 처리 현황", sub: "폐기·이관·보존 결정", icon: ClipboardCheck },
  { id: "relocation", label: "이관 우선순위", sub: "수원시 분관 이동", icon: ArrowLeftRight },
];

// 문제 3: 하단 퀵액션(알림/설정)의 icon/badge/onClick 타입도 any 대신 명시적 인터페이스로 정의
interface QuickAction {
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick: () => void;
}

// 개선 1: hex 컬러 + 투명도를 rgba()로 변환 — NAV가 정확히 6자리 hex라는 문자열 연결 가정을 없앰
function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 문제 2: 하드코딩된 상태 오버라이드를 컴포넌트 로직에서 분리해 이름 붙은 상수로 관리
// TODO: 장기적으로는 이 초기 오버라이드를 data/ 쪽 시드 데이터 자체에 반영하는 것을 권장
const INITIAL_STATUS_OVERRIDES: Record<string, BookStatus> = {
  "BK-10041": "폐기승인",
  "BK-10078": "이관승인",
  "BK-10112": "보존결정",
};

// 문제 4/5: 라벨/아이콘의 표시 여부를 데스크탑 hover뿐 아니라 모바일 탭 상태로도 제어할 수 있도록 헬퍼화
function labelVisibility(pinned: boolean): string {
  if (pinned) {
    return "block opacity-100 transition-opacity duration-150";
  }
  // 마우스를 올리면(hover) 바로 라벨이 보이도록 md 제한 없이 group-hover 적용.
  // lg 이상에서는 사이드바 자체가 항상 펼쳐지므로 라벨도 항상 보이도록 유지.
  return "hidden opacity-0 group-hover/side:block group-focus-within/side:block group-hover/side:opacity-100 group-focus-within/side:opacity-100 lg:block lg:opacity-100 transition-opacity duration-150";
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [page, setPage] = useState<PageId>("overview");

  // 클릭하면 hover 여부와 상관없이 펼쳐진 상태로 고정(pin)되는 상태
  const [sidebarPinned, setSidebarPinned] = useState(false);

  // 문제 4: 알림 패널 - 실제 알림 데이터/패널이 없어 임시로 열림 상태만 토글 (추후 실제 알림 목록 연결 필요)
  const [notifOpen, setNotifOpen] = useState(false);

  const [books, setBooks] = useState<Book[]>(() =>
    ALL_BOOKS.map((b) =>
      INITIAL_STATUS_OVERRIDES[b.id] ? { ...b, status: INITIAL_STATUS_OVERRIDES[b.id] } : b
    )
  );
  const [inspections, setInspections] = useState<Record<string, DamageInspection>>(() => ({ ...DAMAGE_INSPECTIONS }));

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  const visibility = labelVisibility(sidebarPinned);

  // 문제 4: 알림/설정 버튼에 실제 onClick 연결 (기능 자체는 추후 구현 필요하지만 최소한 no-op이 아니도록 함)
  const quickActions: QuickAction[] = [
    { icon: Bell, label: "알림", badge: 4, onClick: () => setNotifOpen((v) => !v) },
    { icon: Settings, label: "설정", onClick: () => setPage("overview") /* TODO: 설정 페이지 연결 */ },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">

      <aside
        className={`group/side relative z-20 ${sidebarPinned ? "w-64" : "w-14 hover:w-64 focus-within:w-64"} lg:w-64 flex-shrink-0 flex flex-col
          bg-sidebar border-r border-sidebar-border overflow-hidden
          transition-[width] duration-200 ease-out`}
      >

        <div className="px-3 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 mb-2.5">
            <button
              type="button"
              onClick={() => setSidebarPinned((v) => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: NAV }}
              aria-label="사이드바 펼침 고정 토글"
            >
              <BookOpen className="w-[18px] h-[18px] text-white md:block hidden" />
              <Menu className="w-[18px] h-[18px] text-white md:hidden block" />
            </button>
            <div className={`min-w-0 ${visibility}`}>
              <p className="text-sm font-semibold text-white leading-tight whitespace-nowrap" style={{ fontFamily: "var(--font-serif)" }}>도서 관리 시스템</p>
              <p className="text-xs leading-tight whitespace-nowrap text-sidebar-foreground/60">Library Dashboard v1.0</p>
            </div>
          </div>

          {/* [수정 2] 북수원도서관 고정 박스: 축소 시 패딩 및 오버플로우로 인해 아이콘이 잘리거나 어색해지는 현상 방지 */}
          <div
            className={`flex items-center gap-1.5 rounded-md transition-all ${sidebarPinned ? "px-2.5 py-2 w-56" : "p-2 w-8 group-hover/side:w-56 group-hover/side:px-2.5 group-hover/side:py-2 lg:w-56 lg:px-2.5 lg:py-2"
              }`}
            style={{ backgroundColor: withAlpha(NAV, 0.21), border: `1px solid ${withAlpha(NAV, 0.38)}` }}
          >
            <Pin className="w-[14px] h-[14px] flex-shrink-0" style={{ color: "var(--sidebar-primary)" }} />
            <div className={`min-w-0 ${visibility}`}>
              <p className="text-sm font-semibold leading-tight whitespace-nowrap text-white">북수원도서관</p>
              <p className="text-xs leading-tight whitespace-nowrap text-sidebar-foreground/60">경기도 수원시 장안구</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3.5 flex flex-col gap-1">
          <p className={`px-2 pb-2 text-xs font-semibold uppercase tracking-widest whitespace-nowrap text-sidebar-foreground/50 ${visibility}`}>메뉴</p>
          {NAV_ITEMS.map((item) => {
            const active = page === item.id;
            return (
              <button key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-left w-full transition-colors"
                style={{ backgroundColor: active ? "var(--sidebar-accent)" : "transparent", color: active ? "var(--sidebar-primary)" : "var(--sidebar-foreground)" }}>
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <div className={`min-w-0 ${visibility}`}>
                  <p className="text-sm font-medium leading-tight whitespace-nowrap">{item.label}</p>
                  <p className="text-xs leading-tight whitespace-nowrap text-sidebar-foreground/50">{item.sub}</p>
                </div>
                {active && <ChevronRight className={`w-[14px] h-[14px] ml-auto flex-shrink-0 ${visibility}`} style={{ color: "var(--sidebar-primary)" }} />}
              </button>
            );
          })}
        </nav>

        <div className="px-2 py-3.5 border-t border-sidebar-border flex flex-col gap-1">
          {quickActions.map(({ icon: Icon, label, badge, onClick }) => (
            <button key={label} title={label} onClick={onClick}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md w-full text-left hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70">
              <div className="relative flex-shrink-0">
                <Icon className="w-[18px] h-[18px]" />
                {!!badge && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: RED }}>{badge}</span>}
              </div>
              <span className={`text-sm whitespace-nowrap ${visibility}`}>{label}</span>
            </button>
          ))}
          {notifOpen && (
            <div className={`px-3 py-2 text-xs rounded-md bg-sidebar-accent text-sidebar-foreground/70 ${visibility}`}>
              알림 패널 연결 예정 (TODO)
            </div>
          )}
          <button title="로그아웃" onClick={() => { logout(); setSession(null); }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-md w-full text-left hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70">
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <span className={`text-sm whitespace-nowrap ${visibility}`}>로그아웃</span>
          </button>
          <div className="mt-2 pt-2.5 border-t border-sidebar-border flex items-center gap-2 px-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: NAV }}>{session.name?.[0] ?? "?"}</div>
            <div className={`min-w-0 ${visibility}`}>
              <p className="text-sm font-medium text-white leading-tight whitespace-nowrap">{session.name}</p>
              <p className="text-xs leading-tight whitespace-nowrap text-sidebar-foreground/50">{session.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
        <header className="min-h-12 border-b border-border bg-card flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-6 py-2.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
            <Building2 className="hidden sm:block w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">수원시 공공도서관 시스템</span>
            <ChevronRight className="hidden sm:block w-[14px] h-[14px] flex-shrink-0" />
            <span className="hidden sm:inline font-medium whitespace-nowrap" style={{ color: NAV }}>북수원도서관</span>
            <ChevronRight className="hidden sm:block w-[14px] h-[14px] flex-shrink-0" />
            <span className="font-medium text-foreground whitespace-nowrap">{NAV_ITEMS.find((n) => n.id === page)?.label}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground flex-shrink-0">
            <span className="whitespace-nowrap">
              데이터 기준일:{" "}
              <span className="font-medium text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{DATA_AS_OF_DATE}</span>
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {page === "overview" && <OverviewPage />}
          {page === "wear-queue" && <WearQueuePage books={books} setBooks={setBooks} inspections={inspections} setInspections={setInspections} inspectorName={session.name} />}
          {page === "wear-manage" && <WearManagePage books={books} setBooks={setBooks} inspections={inspections} setInspections={setInspections} inspectorName={session.name} />}
          {page === "relocation" && <RelocationPage />}
        </main>
      </div>
    </div>
  );
}