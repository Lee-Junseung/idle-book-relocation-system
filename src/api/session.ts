// 로그인 세션 저장/조회를 담당하는 모듈.
// 실제 인증 자체는 api/auth.ts(loginApi/registerApi)가 백엔드와 통신해서 처리함
// 이 파일은 "로그인 성공 후 세션을 저장해서 새로고침해도 로그인 상태가 유지되게 하는 것"만 담당.
import { Session } from "../types";

const SESSION_KEY = "lib_session";

export function saveSession(session: Session): boolean {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return true;
    } catch {
        // 저장 공간 접근 불가 시 조용히 무시 — 로그인 자체는 이미 성공했으므로 세션 유지만 안 될 뿐
        return false;
    }
}

export function loadSession(): Session | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
        return null;
    }
}

export function logout() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* no-op */ }
}
