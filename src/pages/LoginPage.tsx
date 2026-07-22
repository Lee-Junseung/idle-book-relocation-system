// 사서 로그인/회원가입/아이디·비밀번호 찾기를 처리하는 로그인 화면 (공공기관 사이트 스타일: 중앙 단일 박스, 라벨형 입력)
import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import {
  BookOpen, User as UserIcon, Lock, Mail, Hash, Eye, EyeOff,
  AlertCircle, CheckCircle2, X, KeyRound, Search, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { withAlpha } from "../components";
import { NAV, GREEN, RED } from "../constants/colors";
import { login, registerUser, findUserId, resetPassword } from "../data/auth";
import { Session, User } from "../types";

const MONO = "'JetBrains Mono', monospace";
const SERIF = "var(--font-serif)";
const REMEMBER_ID_KEY = "lib_remember_id";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const [signupOpen, setSignupOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);

  const [loginId, setLoginId] = useState(() => {
    try { return localStorage.getItem(REMEMBER_ID_KEY) ?? ""; } catch { return ""; }
  });
  const [rememberId, setRememberId] = useState(() => {
    try { return !!localStorage.getItem(REMEMBER_ID_KEY); } catch { return false; }
  });
  const [loginPw, setLoginPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [notice, setNotice] = useState("");

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!loginId.trim() || !loginPw) {
      setLoginError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    const result = login(loginId.trim(), loginPw);
    if (!result.ok) {
      setLoginError(result.message);
      return;
    }
    try {
      if (rememberId) localStorage.setItem(REMEMBER_ID_KEY, loginId.trim());
      else localStorage.removeItem(REMEMBER_ID_KEY);
    } catch { /* 저장 공간 접근 불가 시 조용히 무시 (기능 자체는 비필수) */ }
    onLogin(result.session);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md">

        {/* 기관 식별 영역 */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-11 h-11 rounded-sm flex items-center justify-center mb-3" style={{ backgroundColor: NAV }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-foreground" style={{ fontFamily: SERIF, fontSize: "21px", fontWeight: 700 }}>
            도서 관리 시스템
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "12.5px" }}>
            수원시 공공도서관 통합관리 시스템 · 사서 전용
          </p>
        </div>

        {/* 로그인 박스 */}
        <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden">
          <div className="h-[3px] w-full" style={{ backgroundColor: NAV }} />

          <form onSubmit={handleLogin} className="px-6 py-7 sm:px-8 flex flex-col gap-4">
            {notice && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-sm text-sm font-medium" style={{ backgroundColor: withAlpha(GREEN, 0.08), color: GREEN }}>
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
                <button type="button" onClick={() => setShowPw((s) => !s)} className="flex-shrink-0 text-muted-foreground" aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 표시"}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <label className="flex items-center gap-2 -mt-1 select-none cursor-pointer">
              <input type="checkbox" checked={rememberId} onChange={(e) => setRememberId(e.target.checked)}
                className="w-3.5 h-3.5 rounded-sm accent-primary" />
              <span className="text-sm text-muted-foreground">아이디 저장</span>
            </label>

            {loginError && (
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: RED }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {loginError}
              </div>
            )}

            <button
              type="submit"
              className="mt-1 py-3 rounded-sm text-sm font-semibold flex items-center justify-center gap-2 text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: NAV }}
            >
              로그인 <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-3 mt-1">
              <button type="button" onClick={() => setSignupOpen(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                회원가입
              </button>
              <span className="w-px h-3.5 bg-border" />
              <button type="button" onClick={() => setFindOpen(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                아이디 · 비밀번호 찾기
              </button>
            </div>
          </form>
        </div>

        {/* 하단 안내 영역 */}
        <div className="flex flex-col items-center gap-1.5 mt-5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>이용약관</span>
            <span className="w-px h-2.5 bg-border" />
            <span>개인정보처리방침</span>
          </div>
          <p className="text-[11px] text-muted-foreground" style={{ fontFamily: MONO }}>© 2026 수원시 공공도서관 관리 시스템</p>
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
      {findOpen && <FindAccountModal onClose={() => setFindOpen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal shell                                                       */
/* ------------------------------------------------------------------ */
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="login-modal-title"
        className="relative rounded-sm w-full max-w-sm overflow-hidden bg-card border border-border shadow-lg">
        <div className="h-[3px] w-full" style={{ backgroundColor: NAV }} />
        <div className="px-6 py-4 flex items-center justify-between border-b border-border">
          <h3 id="login-modal-title" className="text-foreground" style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} aria-label="닫기" className="p-1.5 rounded-sm hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function SignupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string) => void }) {
  const [suId, setSuId] = useState("");
  const [suPw, setSuPw] = useState("");
  const [suPw2, setSuPw2] = useState("");
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suLibId, setSuLibId] = useState("");
  const [suError, setSuError] = useState("");

  function handleSignup(e: FormEvent) {
    e.preventDefault();
    setSuError("");
    if (!suId.trim() || !suPw || !suPw2 || !suName.trim() || !suEmail.trim() || !suLibId.trim()) {
      setSuError("이름, 이메일, 사서번호를 포함한 모든 항목은 필수입니다."); return;
    }
    if (suPw !== suPw2) { setSuError("비밀번호가 일치하지 않습니다."); return; }
    if (suPw.length < 4) { setSuError("비밀번호는 4자 이상이어야 합니다."); return; }
    if (!/^\S+@\S+\.\S+$/.test(suEmail.trim())) { setSuError("이메일 형식이 올바르지 않습니다."); return; }

    const newUser: User = {
      id: suId.trim(), password: suPw, name: suName.trim(),
      email: suEmail.trim(), librarianId: suLibId.trim(),
    };
    const result = registerUser(newUser);
    if (!result.ok) { setSuError(result.message); return; }
    onSuccess(newUser.id);
  }

  return (
    <ModalShell title="회원가입" onClose={onClose}>
      <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
        <Field icon={UserIcon} label="아이디" placeholder="아이디" value={suId} onChange={setSuId} autoComplete="username" />
        <Field icon={Lock} label="비밀번호" placeholder="비밀번호 (4자 이상)" type="password" value={suPw} onChange={setSuPw} autoComplete="new-password" />
        <Field icon={Lock} label="비밀번호 확인" placeholder="비밀번호 확인" type="password" value={suPw2} onChange={setSuPw2} autoComplete="new-password" />
        <div className="h-px my-0.5 bg-border" />
        <Field icon={UserIcon} label="이름" placeholder="이름 (필수)" value={suName} onChange={setSuName} />
        <Field icon={Mail} label="이메일" placeholder="이메일 (필수)" type="email" value={suEmail} onChange={setSuEmail} autoComplete="email" />
        <Field icon={Hash} label="사서번호" placeholder="사서번호 (필수)" value={suLibId} onChange={setSuLibId} />
        {suError && (
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: RED }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {suError}
          </div>
        )}
        <button type="submit" className="mt-1 py-3 rounded-sm text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: NAV }}>
          가입하기
        </button>
        <p className="text-center mt-1 text-muted-foreground" style={{ fontSize: "12.5px" }}>이름 · 이메일 · 사서번호는 필수 입력 항목입니다.</p>
      </form>
    </ModalShell>
  );
}

function FindAccountModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"id" | "pw">("id");

  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [idResult, setIdResult] = useState<{ ok: true; id: string } | { ok: false; message: string } | null>(null);

  const [pId, setPId] = useState("");
  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pNewPw, setPNewPw] = useState("");
  const [pNewPw2, setPNewPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function handleFindId(e: FormEvent) {
    e.preventDefault();
    if (!fName.trim() || !fEmail.trim()) { setIdResult({ ok: false, message: "이름과 이메일을 모두 입력해 주세요." }); return; }
    setIdResult(findUserId(fName, fEmail));
  }

  function handleResetPw(e: FormEvent) {
    e.preventDefault();
    if (!pId.trim() || !pName.trim() || !pEmail.trim() || !pNewPw || !pNewPw2) {
      setPwMsg({ ok: false, text: "모든 항목을 입력해 주세요." }); return;
    }
    if (pNewPw !== pNewPw2) { setPwMsg({ ok: false, text: "새 비밀번호가 일치하지 않습니다." }); return; }
    if (pNewPw.length < 4) { setPwMsg({ ok: false, text: "비밀번호는 4자 이상이어야 합니다." }); return; }
    const result = resetPassword(pId, pName, pEmail, pNewPw);
    if (!result.ok) { setPwMsg({ ok: false, text: result.message }); return; }
    setPwMsg({ ok: true, text: "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요." });
  }

  return (
    <ModalShell title="아이디 / 비밀번호 찾기" onClose={onClose}>
      <div className="grid grid-cols-2 rounded-sm overflow-hidden mb-4 border border-border">
        <button onClick={() => setTab("id")} className={`py-2.5 text-sm font-semibold transition-colors ${tab === "id" ? "text-white" : "text-muted-foreground"}`}
          style={tab === "id" ? { backgroundColor: NAV } : undefined}>
          아이디 찾기
        </button>
        <button onClick={() => setTab("pw")} className={`py-2.5 text-sm font-semibold transition-colors ${tab === "pw" ? "text-white" : "text-muted-foreground"}`}
          style={tab === "pw" ? { backgroundColor: NAV } : undefined}>
          비밀번호 찾기
        </button>
      </div>

      {tab === "id" ? (
        <form onSubmit={handleFindId} className="flex flex-col gap-3.5">
          <Field icon={UserIcon} label="이름" placeholder="이름" value={fName} onChange={setFName} />
          <Field icon={Mail} label="이메일" placeholder="이메일" type="email" value={fEmail} onChange={setFEmail} autoComplete="email" />
          <button type="submit" className="mt-1 flex items-center justify-center gap-1.5 py-3 rounded-sm text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: NAV }}>
            <Search className="w-4 h-4" /> 아이디 조회
          </button>
          {idResult && (
            idResult.ok ? (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-sm text-sm font-medium" style={{ backgroundColor: withAlpha(GREEN, 0.08), color: GREEN }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                회원님의 아이디는 <span style={{ fontFamily: MONO }}>{idResult.id}</span> 입니다.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: RED }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {idResult.message}
              </div>
            )
          )}
        </form>
      ) : (
        <form onSubmit={handleResetPw} className="flex flex-col gap-3.5">
          <Field icon={UserIcon} label="아이디" placeholder="아이디" value={pId} onChange={setPId} autoComplete="username" />
          <Field icon={UserIcon} label="이름" placeholder="이름" value={pName} onChange={setPName} />
          <Field icon={Mail} label="이메일" placeholder="이메일" type="email" value={pEmail} onChange={setPEmail} autoComplete="email" />
          <div className="h-px my-0.5 bg-border" />
          <Field icon={KeyRound} label="새 비밀번호" placeholder="새 비밀번호" type="password" value={pNewPw} onChange={setPNewPw} autoComplete="new-password" />
          <Field icon={KeyRound} label="새 비밀번호 확인" placeholder="새 비밀번호 확인" type="password" value={pNewPw2} onChange={setPNewPw2} autoComplete="new-password" />
          <button type="submit" className="mt-1 py-3 rounded-sm text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: NAV }}>
            비밀번호 재설정
          </button>
          {pwMsg && (
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: pwMsg.ok ? GREEN : RED }}>
              {pwMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {pwMsg.text}
            </div>
          )}
        </form>
      )}
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Field — 라벨을 입력창 위에 명시 (공공기관 웹접근성 관례)                */
/* ------------------------------------------------------------------ */
function Field({ icon: Icon, label, placeholder, type = "text", value, onChange, trailing, autoComplete }: {
  icon: LucideIcon; label: string; placeholder: string; type?: string; value: string; onChange: (v: string) => void; trailing?: ReactNode; autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-sm border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30 transition-colors">
        <Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="flex-1 min-w-0 text-sm bg-transparent outline-none text-foreground"
        />
        {trailing}
      </div>
    </div>
  );
}
