// 로그인/회원가입/비밀번호 재설정을 처리하는 인증 모듈
//
// ⚠️ 중요: 이 모듈은 백엔드 서버 없이 브라우저 localStorage만으로 동작하는 데모/프로토타입용 구현입니다.
// 비밀번호가 평문으로 저장되고, DEFAULT_ADMIN의 비밀번호도 소스코드에 그대로 노출되어 있어
// 개발자도구로 누구나 모든 계정 정보를 열람할 수 있습니다. 실제 사용자 데이터를 다루는 배포 환경에서는
// 반드시 서버 사이드 인증(해시+솔트 저장, 세션/토큰 검증 등)으로 교체해야 합니다.
import { User, Session } from "../types";

const USERS_KEY = "lib_users";
const SESSION_KEY = "lib_session";

export const DEFAULT_ADMIN: User = {
  id: "admin",
  password: "admin",
  name: "관리자",
  email: "admin@library.go.kr",
  librarianId: "L-0000",
};

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

// 버그 수정: 기존엔 저장 실패(예: 프라이빗 브라우징 모드에서 localStorage 차단) 시에도
// 호출부가 이를 알 방법이 없어 registerUser/resetPassword가 "성공"을 반환하고도 실제로는
// 저장이 안 되는 경우가 있었음 -> 성공 여부를 boolean으로 반환하도록 수정
function saveUsers(users: User[]): boolean {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  } catch {
    return false;
  }
}

function findUser(id: string): User | undefined {
  if (id === DEFAULT_ADMIN.id) return DEFAULT_ADMIN;
  return loadUsers().find((u) => u.id === id);
}

// 개선: User -> Session 변환 시 password를 제외한 4개 필드를 수동으로 나열하던 것을
// 구조분해로 대체 (User에 필드가 추가돼도 자동으로 따라감)
function toSession(user: User): Session {
  const { password: _password, ...session } = user;
  return session;
}

export function registerUser(user: User): { ok: true } | { ok: false; message: string } {
  if (findUser(user.id)) return { ok: false, message: "이미 사용 중인 아이디입니다." };
  const users = loadUsers();
  users.push(user);
  if (!saveUsers(users)) {
    return { ok: false, message: "저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요." };
  }
  return { ok: true };
}

// 개선: 기존엔 login()이 비밀번호가 포함된 User 전체를 반환해서, 호출부(LoginPage)가 매번 직접
// 비밀번호를 제거하는 코드를 다시 작성해야 했음 -> 처음부터 Session(비밀번호 제외)을 반환
export function login(id: string, password: string): { ok: true; session: Session } | { ok: false; message: string } {
  const user = findUser(id);
  if (!user) return { ok: false, message: "등록되지 않은 아이디입니다." };
  if (user.password !== password) return { ok: false, message: "비밀번호가 일치하지 않습니다." };
  const session = toSession(user);
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    return { ok: false, message: "세션 저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요." };
  }
  return { ok: true, session };
}

export function findUserId(name: string, email: string): { ok: true; id: string } | { ok: false; message: string } {
  const all = [DEFAULT_ADMIN, ...loadUsers()];
  const user = all.find((u) => u.name === name.trim() && u.email === email.trim());
  if (!user) return { ok: false, message: "일치하는 회원 정보를 찾을 수 없습니다." };
  const masked = user.id.length <= 2 ? user.id[0] + "*" : user.id.slice(0, 2) + "*".repeat(user.id.length - 2);
  return { ok: true, id: masked };
}

export function resetPassword(id: string, name: string, email: string, newPassword: string): { ok: true } | { ok: false; message: string } {
  if (id.trim() === DEFAULT_ADMIN.id) return { ok: false, message: "관리자(admin) 계정의 비밀번호는 이 화면에서 변경할 수 없습니다." };
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === id.trim() && u.name === name.trim() && u.email === email.trim());
  if (idx === -1) return { ok: false, message: "입력하신 정보와 일치하는 계정을 찾을 수 없습니다." };
  users[idx] = { ...users[idx], password: newPassword };
  if (!saveUsers(users)) {
    return { ok: false, message: "저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요." };
  }
  return { ok: true };
}

export function logout() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
