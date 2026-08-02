import { loadSession, logout } from "./session";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// 로그인 이후 저장된 세션에서 accessToken을 꺼내 Authorization 헤더로 만든다.
// 세션이 없거나(로그인 전) accessToken이 없으면 빈 객체를 반환해 헤더를 붙이지 않는다.
// (로그인/회원가입 요청 시점에는 세션이 없는 게 정상이므로 이 경우도 자연스럽게 처리됨)
function authHeaders(): Record<string, string> {
    const session = loadSession();
    return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

// 401(인증 만료/실패) 응답을 받았을 때 실행할 콜백.
// App.tsx가 마운트 시 setUnauthorizedHandler로 자신의 setSession(null)을 등록해두면, 어느 화면에서 API를 호출하다 401을 받든 자동으로 로그인 화면으로 돌아간다.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
    unauthorizedHandler = handler;
}

// 로그인/회원가입 자체가 401을 반환하는 경우(아이디·비번 오류)에도 호출되지만, 그 시점엔 세션이 이미 없는 상태라 logout()과 콜백 모두 아무 부작용 없이 무시된다.
function handleUnauthorized() {
    logout();
    unauthorizedHandler?.();
}

// 서버가 내려주는 에러 응답(message/error/status 또는 statusCode)을 그대로 담아 던지는 에러.
// 화면단에서 err.message를 그대로 사용자에게 보여줄 수 있다.
export class ApiError extends Error {
    statusCode: number;
    error?: string;

    constructor(message: string, statusCode: number, error?: string) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.error = error;
    }
}

// 백엔드 응답이 도메인마다 status / statusCode로 필드명이 다를 수 있어 client.ts 레벨에서 방어적으로 둘 다 시도한다. (특정 도메인 타입에 묶이지 않도록 unknown으로 받음)
function extractStatus(body: unknown, fallback: number): number {
    const b = body as { status?: number; statusCode?: number } | null;
    return b?.status ?? b?.statusCode ?? fallback;
}

// 응답 실패 시 서버가 4XX, 5XX 응답
// -> 응답 JSON에 message 필드가 있으면 extractMessage가 그 값을 그대로 반환 (화면에 백엔드 문구 그대로 노출)
// -> 응답 JSON에 message 필드가 없으면 client.ts에서 자동 생성된 문구 반환 (`API 요청 실패: /api/users/login (status 401)`)
function extractMessage(body: unknown, path: string, fallback: number): string {
    const b = body as { message?: string } | null;
    return b?.message ?? `API 요청 실패: ${path} (status ${fallback})`;
}

function extractError(body: unknown): string | undefined {
    const b = body as { error?: string } | null;
    return b?.error;
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { ...authHeaders() },
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || (json as { success?: boolean } | null)?.success === false) {
        const statusCode = extractStatus(json, res.status);
        if (statusCode === 401) handleUnauthorized();
        const message = extractMessage(json, path, res.status);
        throw new ApiError(message, statusCode, extractError(json));
    }

    return json as T;
}

// POST 요청 공통 함수.
// 200이 아니면 응답 바디의 message/error/statusCode를 담아 ApiError를 던진다.
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
        const statusCode = extractStatus(json, res.status);
        if (statusCode === 401) handleUnauthorized();
        const message = extractMessage(json, path, res.status);
        throw new ApiError(message, statusCode, extractError(json));
    }

    return json as T;
}

// 개발 중 네트워크 지연을 흉내내고 싶을 때
export function mockDelay<T>(data: T, ms = 300): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// 문자열을 결정적(deterministic)으로 해시한다 — 같은 입력이면 항상 같은 값을 반환하므로 새로고침해도 목업 데이터가 흔들리지 않는다.
// 암호학적 용도가 아닌 mock 데이터 생성 전용.
export function hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
}
