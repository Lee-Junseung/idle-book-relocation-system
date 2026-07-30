// 사서 로그인/회원가입을 처리하는 로그인 화면
import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import {
  BookOpen, User as UserIcon, Lock, Mail, Hash, Tag, Eye, EyeOff,
  AlertCircle, CheckCircle2, X, ArrowRight, Loader2, LibraryBig,
  type LucideIcon,
} from "lucide-react";
import { withAlpha } from "../components";
import { NAV, GREEN, RED } from "../constants/colors";
import { loginApi, registerApi } from "../api/auth";
import { ApiError } from "../api/client";
import { Session } from "../types";

const MONO = "'JetBrains Mono', monospace";
const SERIF = "var(--font-serif)";
const REMEMBER_ID_KEY = "lib_remember_id";

const BRASS = "#C9A66B";

const CALL_NUMBERS = [
  "북수원도서관",
  "슬기샘어린이도서관",
  "일월도서관",
  "대추골도서관",
  "화서다산도서관",
  "선경도서관",
  "중앙도서관",
  "호매실도서관",
  "서수원도서관",
  "광교홍재도서관",
  "영통도서관"
];

const PROCESS_STEPS = [
  { n: "01", text: "유휴 도서 파손 점검" },
  { n: "02", text: "이관 · 보관 · 폐기 결정" },
  { n: "03", text: "이관 도서 우선순위 배정" },
];

export function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const [signupOpen, setSignupOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const [loginId, setLoginId] = useState(() => {
    try { return localStorage.getItem(REMEMBER_ID_KEY) ?? ""; } catch { return ""; }
  });
  const [rememberId, setRememberId] = useState(() => {
    try { return !!localStorage.getItem(REMEMBER_ID_KEY); } catch { return false; }
  });
  const [loginPw, setLoginPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!loginId.trim() || !loginPw) {
      setLoginError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await loginApi({ id: loginId.trim(), password: loginPw });

      try {
        if (rememberId) localStorage.setItem(REMEMBER_ID_KEY, loginId.trim());
        else localStorage.removeItem(REMEMBER_ID_KEY);
      } catch { /* 저장 공간 접근 불가 시 조용히 무시 (기능 자체는 비필수) */ }

      const session: Session = {
        name: res.name,
        email: res.email,
        nickname: res.nickname,
      };
      onLogin(session);
    } catch (err) {
      if (err instanceof ApiError) {
        setLoginError(err.message);
      } else {
        setLoginError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background">
      <style>{`
        @keyframes catalog-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative flex-col justify-between overflow-hidden px-12 py-14"
        style={{ backgroundColor: NAV }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-[0.5] pointer-events-none mix-blend-overlay" aria-hidden="true">
          <filter id="loginGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#loginGrain)" />
        </svg>

        <div
          className="absolute -top-28 -left-24 w-[440px] h-[440px] rounded-full blur-[100px] opacity-[0.28] pointer-events-none"
          style={{ background: `radial-gradient(circle, ${BRASS} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-32 -right-16 w-[360px] h-[360px] rounded-full blur-[110px] opacity-[0.16] pointer-events-none"
          style={{ background: `radial-gradient(circle, #ffffff 0%, transparent 70%)` }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-sm flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/15">
            <LibraryBig className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-white/90 text-sm font-semibold tracking-wide">도서 관리 시스템</span>
        </div>

        <div className="relative z-10">
          <h2
            className="text-white leading-[1.35] mb-4"
            style={{ fontFamily: SERIF, fontSize: "30px", fontWeight: 700, letterSpacing: "-0.01em" }}
          >
            장서 스마트 순환 시스템<br />YooHoo 유휴
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-[320px] mb-8">
            YooHoo는 소장 자료의 상태, 이동, 보존 결정을 사서가 직접 추적할 수 있도록 설계되었습니다.
          </p>

          <div className="flex flex-col mb-7">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.n} className="relative flex gap-3 pb-5 last:pb-0">
                {i < PROCESS_STEPS.length - 1 && (
                  <span className="absolute left-3 top-6 bottom-0 w-px" style={{ backgroundColor: "rgba(255,255,255,0.14)" }} />
                )}
                <span
                  className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center"
                  style={{
                    borderColor: withAlpha(BRASS, 0.5),
                    backgroundColor: NAV,
                    color: BRASS,
                    fontFamily: MONO,
                    fontSize: "10px",
                  }}
                >
                  {step.n}
                </span>
                <span className="text-white/80 text-sm pt-0.5 leading-snug">{step.text}</span>
              </div>
            ))}
          </div>

          <div
            className="relative overflow-hidden h-5"
            style={{ maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)" }}
          >
            <div
              className="flex gap-5 whitespace-nowrap absolute motion-safe:animate-[catalog-marquee_26s_linear_infinite]"
              style={{ fontFamily: MONO, fontSize: "10.5px", color: "rgba(255,255,255,0.32)" }}
            >
              {[...CALL_NUMBERS, ...CALL_NUMBERS].map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-white/40" style={{ fontFamily: MONO, fontSize: "11px" }}>
          <span>SUWON PUBLIC LIBRARY</span>
          <span>© 2026</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
        <div
          className="w-full max-w-[380px] motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0px)" : "translateY(10px)",
          }}
        >
          {/* 모바일 전용 헤더 (좌측 패널 대체) */}
          <div className="flex lg:hidden flex-col items-center text-center mb-8">
            <div className="w-11 h-11 rounded-sm flex items-center justify-center mb-3" style={{ backgroundColor: NAV }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-foreground" style={{ fontFamily: SERIF, fontSize: "20px", fontWeight: 700 }}>
              도서 관리 시스템
            </h1>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "12.5px" }}>
              수원시 공공도서관 통합관리 시스템 · 사서 전용
            </p>
          </div>

          <div className="hidden lg:block mb-9">
            <h1 className="text-foreground" style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 700, letterSpacing: "-0.01em" }}>
              다시 오셨네요
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">사서 계정으로 로그인해 업무를 이어가세요.</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {notice && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-md text-sm font-medium" style={{ backgroundColor: withAlpha(GREEN, 0.08), color: GREEN }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {notice}
              </div>
            )}

            <Field icon={UserIcon} label="아이디" placeholder="아이디를 입력하세요" value={loginId} onChange={setLoginId} autoComplete="username" />
            <Field
              icon={Lock}
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              type={showPw ? "text" : "password"}
              value={loginPw}
              onChange={setLoginPw}
              autoComplete="current-password"
              trailing={
                <button type="button" onClick={() => setShowPw((s) => !s)} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="flex items-center justify-between -mt-1">
              <label className="flex items-center gap-2 select-none cursor-pointer">
                <input type="checkbox" checked={rememberId} onChange={(e) => setRememberId(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-sm accent-primary" />
                <span className="text-sm text-muted-foreground">아이디 저장</span>
              </label>
              <span className="text-sm text-muted-foreground">아이디 · 비밀번호 찾기</span>
            </div>

            {/* 에러 영역: 항상 렌더링되어 있어 메시지 유무와 상관없이 높이가 고정됨 */}
            <div className="min-h-[16px] flex items-center">
              {loginError && (
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: RED }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {loginError}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="mt-1 py-3 rounded-md text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all hover:opacity-90 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:translate-y-0"
              style={{ backgroundColor: NAV }}
            >
              {loginLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 로그인 중...</>
              ) : (
                <>로그인 <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSignupOpen(true)}
              className="py-3 rounded-md text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
            >
              사서 계정 만들기
            </button>
          </form>
        </div>
      </div>

      {signupOpen && (
        <SignupModal
          onClose={() => setSignupOpen(false)}
          onSuccess={(id) => {
            setSignupOpen(false);
            setLoginId(id);
            setNotice("회원가입이 완료되었습니다. 로그인해 주세요.");
          }}
        />
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeIn_0.15s_ease-out]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="login-modal-title"
        className="relative rounded-lg w-full max-w-xl overflow-hidden bg-card border border-border shadow-xl max-h-[88vh] flex flex-col">
        <div className="h-[3px] w-full flex-shrink-0" style={{ backgroundColor: NAV }} />
        <div className="px-6 py-3.5 flex items-center justify-between border-b border-border flex-shrink-0">
          <h3 id="login-modal-title" className="text-foreground" style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} aria-label="닫기" className="p-1.5 rounded-sm hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function SignupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string) => void }) {
  const [suId, setSuId] = useState("");
  const [suPw, setSuPw] = useState("");
  const [suPw2, setSuPw2] = useState("");
  const [suName, setSuName] = useState("");
  const [suNickname, setSuNickname] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suLibId, setSuLibId] = useState("");
  const [suErrors, setSuErrors] = useState<Record<string, string>>({});
  const [suLoading, setSuLoading] = useState(false);

  function validateSignup(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!suName.trim()) errors.name = "이름은 필수 입력 값입니다.";
    else if (suName.trim().length < 2 || suName.trim().length > 30) errors.name = "이름은 2자에서 30자까지 입력해주세요.";

    if (!suNickname.trim()) errors.nickname = "닉네임은 필수 입력 값입니다.";

    if (!suId.trim()) errors.id = "아이디는 필수 입력 값입니다.";
    else if (suId.trim().length < 4 || suId.trim().length > 20) errors.id = "아이디는 4자에서 20자까지 입력해주세요.";

    if (!suLibId.trim()) errors.libId = "사서 번호는 필수 입력 값입니다.";

    if (!suPw) errors.pw = "비밀번호는 필수 입력 값입니다.";
    else if (suPw.length < 8 || suPw.length > 20) errors.pw = "비밀번호는 8자에서 20자까지 입력해주세요.";

    if (!suPw2) errors.pw2 = "비밀번호 확인을 입력해 주세요.";
    else if (suPw !== suPw2) errors.pw2 = "비밀번호가 일치하지 않습니다.";

    if (!suEmail.trim()) errors.email = "이메일은 필수 입력 값입니다.";
    else if (!/^\S+@\S+\.\S+$/.test(suEmail.trim())) errors.email = "유효한 이메일 형식이 아닙니다.";

    return errors;
  }

  // 백엔드 message에 필드 관련 키워드가 있으면 해당 필드 아래로, 없으면 general로 표시
  function mapServerError(message: string): Record<string, string> {
    if (message.includes("아이디")) return { id: message };
    if (message.includes("이메일")) return { email: message };
    if (message.includes("비밀번호")) return { pw: message };
    if (message.includes("사서")) return { libId: message };
    if (message.includes("이름")) return { name: message };
    if (message.includes("닉네임")) return { nickname: message };
    return { general: message };
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();

    const errors = validateSignup();
    if (Object.keys(errors).length > 0) {
      setSuErrors(errors);
      return;
    }
    setSuErrors({});

    setSuLoading(true);
    try {
      await registerApi({
        id: suId.trim(),
        password: suPw,
        name: suName.trim(),
        nickname: suNickname.trim(),
        email: suEmail.trim(),
        librarianCode: suLibId.trim(),
      });
      onSuccess(suId.trim());
    } catch (err) {
      if (err instanceof ApiError) {
        setSuErrors(mapServerError(err.message));
      } else {
        setSuErrors({ general: "회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
      }
    } finally {
      setSuLoading(false);
    }
  }

  return (
    <ModalShell title="사서 계정 만들기" onClose={onClose}>
      <form onSubmit={handleSignup} className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-3">
          <Field icon={UserIcon} label="이름" placeholder="이름을 입력하세요" value={suName} onChange={setSuName} error={suErrors.name} reserveError compact />
          <Field icon={Tag} label="닉네임" placeholder="닉네임을 입력하세요" value={suNickname} onChange={setSuNickname} error={suErrors.nickname} reserveError compact />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field icon={UserIcon} label="아이디" placeholder="아이디를 입력하세요" value={suId} onChange={setSuId} autoComplete="username" error={suErrors.id} reserveError compact />
          <Field icon={Hash} label="사서번호" placeholder="사서번호를 입력하세요" value={suLibId} onChange={setSuLibId} error={suErrors.libId} reserveError compact />
        </div>

        <Field icon={Lock} label="비밀번호" placeholder="비밀번호를 입력하세요" type="password" value={suPw} onChange={setSuPw} autoComplete="new-password" error={suErrors.pw} reserveError />

        <Field icon={Lock} label="비밀번호 확인" placeholder="비밀번호를 다시 입력하세요" type="password" value={suPw2} onChange={setSuPw2} autoComplete="new-password" error={suErrors.pw2} reserveError />

        <Field icon={Mail} label="이메일" placeholder="이메일을 입력하세요" type="email" value={suEmail} onChange={setSuEmail} autoComplete="email" error={suErrors.email} reserveError />

        {/* 특정 필드에 속하지 않는 서버 오류(예: 네트워크 오류) 전용 영역 */}
        <div className="min-h-[16px] flex items-center">
          {suErrors.general && (
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: RED }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {suErrors.general}
            </div>
          )}
        </div>

        <button type="submit" disabled={suLoading} className="py-3 rounded-md text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2" style={{ backgroundColor: NAV }}>
          {suLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> 가입 처리 중...</>) : "가입하기"}
        </button>
      </form>
    </ModalShell>
  );
}

function Field({ icon: Icon, label, placeholder, type = "text", value, onChange, trailing, autoComplete, compact, error, reserveError }: {
  icon: LucideIcon; label: string; placeholder: string; type?: string; value: string; onChange: (v: string) => void; trailing?: ReactNode; autoComplete?: string; compact?: boolean; error?: string; reserveError?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div
        className={`flex items-center gap-2.5 px-3.5 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/40 transition-colors ${compact ? "py-1.5" : "py-2"}`}
        style={{ borderColor: error ? withAlpha(RED, 0.5) : undefined }}
      >
        <Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="flex-1 min-w-0 truncate text-sm bg-transparent outline-none text-foreground"
        />
        {trailing}
      </div>
      {reserveError && (
        <div className="min-h-[14px] flex items-center overflow-hidden">
          {error && (
            <div
              className="flex items-center gap-1 text-xs font-medium min-w-0 w-full"
              style={{ color: RED }}
              title={error}
            >
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}