export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

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
    const res = await fetch(`${BASE_URL}${path}`);
    const json = await res.json().catch(() => null);

    if (!res.ok || (json as { success?: boolean } | null)?.success === false) {
        const message = extractMessage(json, path, res.status);
        throw new ApiError(message, extractStatus(json, res.status), extractError(json));
    }

    return json as T;
}

// POST 요청 공통 함수. 200이 아니면 응답 바디의 message/error/statusCode를 담아 ApiError를 던진다.
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
        const message = extractMessage(json, path, res.status);
        throw new ApiError(message, extractStatus(json, res.status), extractError(json));
    }

    return json as T;
}

// 개발 중 네트워크 지연을 흉내내고 싶을 때
export function mockDelay<T>(data: T, ms = 300): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}