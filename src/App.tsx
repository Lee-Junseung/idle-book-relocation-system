// 도서관 마모/이관 관리 대시보드의 루트 컴포넌트
// 로그인 게이트, 사이드바 네비게이션(모바일 탭 토글 지원), 헤더, 페이지 라우팅(개요/마모 점검/마모 처리/이관 우선순위)을 담당.
import { useEffect, useState } from "react";
import {
  LayoutDashboard, BookOpen, ArrowLeftRight, Bell, Settings, LogOut,
  ChevronRight, Pin, Building2, CalendarClock, ClipboardCheck, Menu,
  type LucideIcon,
} from "lucide-react";

import { NAV, RED } from "./constants/colors";
import { CURRENT_LIBRARY } from "./constants/library";
import { PageId, Session, Book, BookStatus, DamageInspection } from "./types";
import { loadSession, logout } from "./data/auth";
import { ALL_BOOKS } from "./data";
import { DAMAGE_INSPECTIONS } from "./data/damageInspections";
import { DATA_REF_DATE } from "./data/wearUtils";
import { OverviewPage, WearQueuePage, WearManagePage, RelocationPage, LoginPage } from "./pages";

const DATA_AS_OF_DATE = DATA_REF_DATE.toISOString().slice(0, 10);

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

interface QuickAction {
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick: () => void;
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const INITIAL_STATUS_OVERRIDES: Record<string, BookStatus> = {
  "BK-10041": "폐기승인",
  "BK-10078": "이관승인",
  "BK-10112": "보존결정",
};

function labelVisibility(pinned: boolean): string {
  const base = "min-w-0 transition-opacity duration-150 ease-out";
  if (pinned) {
    return `${base} opacity-100 delay-150`;
  }
  return `${base} opacity-0 pointer-events-none lg:opacity-100 lg:delay-150 lg:pointer-events-auto`;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [page, setPage] = useState<PageId>("overview");

  const [sidebarPinned, setSidebarPinned] = useState(false);

  const [books, setBooks] = useState<Book[]>(() =>
    ALL_BOOKS.map((b) =>
      INITIAL_STATUS_OVERRIDES[b.id] ? { ...b, status: INITIAL_STATUS_OVERRIDES[b.id] } : b
    )
  );
  const [inspections, setInspections] = useState<Record<string, DamageInspection>>(() => ({ ...DAMAGE_INSPECTIONS }));

  // 창 크기를 조절하는 동안에는 사이드바가 펼쳐진 상태로 lg 경계를 넘나들지 않도록 무조건 접힌(false) 상태로 강제한다.
  // 안 그러면 fixed 오버레이와 반투명 배경이 리사이즈 중에 순간적으로 나타났다 사라지며 화면이 튀어 보인다.
  useEffect(() => {
    const handleResize = () => setSidebarPinned(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  const visibility = labelVisibility(sidebarPinned);
  const toggleSidebar = () => setSidebarPinned((v) => !v);

  const quickActions: QuickAction[] = [
    { icon: Bell, label: "알림", onClick: toggleSidebar },
    { icon: Settings, label: "설정", onClick: toggleSidebar },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">

      {/* lg 미만에서 사이드바가 펼쳐질 때 본문을 어둡게 덮는 배경. 탭하면 사이드바가 닫힘. */}
      {sidebarPinned && (
        <div
          className="fixed inset-0 z-10 bg-black/40 lg:hidden"
          onClick={() => setSidebarPinned(false)}
          aria-hidden="true"
        />
      )}

      <div className="w-14 flex-shrink-0 lg:hidden" aria-hidden="true" />

      <aside
        onClick={toggleSidebar}
        className={`group/side z-20 flex-shrink-0 flex flex-col
          bg-sidebar border-r border-sidebar-border overflow-hidden
          fixed inset-y-0 left-0 lg:static lg:inset-auto
          transition-[width] duration-200 ease-in-out
          ${sidebarPinned ? "w-64 shadow-xl lg:shadow-none" : "w-14"} lg:w-64`}
      >

        <div className="py-4 border-b border-sidebar-border flex flex-col gap-2.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
            className="flex items-center gap-2.5 w-full text-left px-3 h-11 rounded-lg hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
            aria-label="사이드바 토글"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: NAV }}
            >
              <BookOpen className="w-[18px] h-[18px] text-white lg:block hidden" />
              <Menu className="w-[18px] h-[18px] text-white lg:hidden block" />
            </div>
            <div className={visibility}>
              <p className="text-sm font-semibold text-white leading-tight whitespace-nowrap" style={{ fontFamily: "var(--font-serif)" }}>도서 관리 시스템</p>
              <p className="text-xs leading-tight whitespace-nowrap text-sidebar-foreground/60">Library Dashboard v1.0</p>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
            className="flex items-center gap-1.5 rounded-md text-left cursor-pointer px-3 h-11 w-full"
            style={{ backgroundColor: withAlpha(NAV, 0.21), border: `1px solid ${withAlpha(NAV, 0.38)}` }}
          >
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <Pin className="w-[14px] h-[14px]" style={{ color: "var(--sidebar-primary)" }} />
            </div>
            <div className={visibility}>
              <p className="text-sm font-semibold leading-tight whitespace-nowrap text-white">{CURRENT_LIBRARY.name}</p>
              <p className="text-xs leading-tight whitespace-nowrap text-sidebar-foreground/60">{CURRENT_LIBRARY.shortAddress}</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 py-3.5 flex flex-col gap-1">
          <p className={`px-3 pb-2 h-5 text-xs font-semibold uppercase tracking-widest whitespace-nowrap text-sidebar-foreground/50 transition-opacity duration-150 ${sidebarPinned ? "opacity-100" : "opacity-0 lg:opacity-100"}`}>메뉴</p>
          {NAV_ITEMS.map((item) => {
            const active = page === item.id;
            return (
              <button key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!sidebarPinned) {
                    // 축소된 상태에서는 첫 클릭에 사이드바만 펼침
                    setSidebarPinned(true);
                  } else {
                    setPage(item.id);
                    setSidebarPinned(false);
                    // 펼쳐진 상태에서 누르면 이동 후 다시 축소
                  }
                }}
                title={item.label}
                className="flex items-center gap-2.5 px-3 h-11 rounded-md text-left w-full transition-colors cursor-pointer"
                style={{ backgroundColor: active ? "var(--sidebar-accent)" : "transparent", color: active ? "var(--sidebar-primary)" : "var(--sidebar-foreground)" }}>
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-[18px] h-[18px]" />
                </div>
                <div className={visibility}>
                  <p className="text-sm font-medium leading-tight whitespace-nowrap">{item.label}</p>
                  <p className="text-xs leading-tight whitespace-nowrap text-sidebar-foreground/50">{item.sub}</p>
                </div>
                {active && <ChevronRight className={`w-[14px] h-[14px] ml-auto flex-shrink-0 ${visibility}`} style={{ color: "var(--sidebar-primary)" }} />}
              </button>
            );
          })}
        </nav>

        <div className="py-3.5 border-t border-sidebar-border flex flex-col gap-1">
          {quickActions.map(({ icon: Icon, label, badge, onClick }) => (
            <button key={label} title={label} onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="flex items-center gap-2.5 px-3 h-11 rounded-md w-full text-left hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 cursor-pointer">
              <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Icon className="w-[18px] h-[18px]" />
                {!!badge && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: RED }}>{badge}</span>}
              </div>
              <span className={`text-sm whitespace-nowrap ${visibility}`}>{label}</span>
            </button>
          ))}

          <button title="로그아웃" onClick={(e) => { e.stopPropagation(); logout(); setSession(null); }}
            className="flex items-center gap-2.5 px-3 h-11 rounded-md w-full text-left hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 cursor-pointer">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-[18px] h-[18px]" />
            </div>
            <span className={`text-sm whitespace-nowrap ${visibility}`}>로그아웃</span>
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
            className="mt-2 pt-2.5 border-t border-sidebar-border flex items-center gap-2 px-3 h-11 w-full text-left cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: NAV }}>{session.name?.[0] ?? "?"}</div>
            <div className={visibility}>
              <p className="text-sm font-medium text-white leading-tight whitespace-nowrap">{session.name}</p>
              <p className="text-xs leading-tight whitespace-nowrap text-sidebar-foreground/50">{session.email}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* 우측 본문 전체 영역: 본문 클릭 시 펼쳐진 사이드바 닫기 */}
      <div
        className="flex-1 flex flex-col overflow-hidden bg-background min-w-0"
        onClick={() => sidebarPinned && setSidebarPinned(false)}
      >
        <header className="min-h-12 border-b border-border bg-card flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-6 py-2.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
            <Building2 className="hidden sm:block w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">수원시 공공도서관 시스템</span>
            <ChevronRight className="hidden sm:block w-[14px] h-[14px] flex-shrink-0" />
            <span className="hidden sm:inline font-medium whitespace-nowrap" style={{ color: NAV }}>{CURRENT_LIBRARY.name}</span>
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