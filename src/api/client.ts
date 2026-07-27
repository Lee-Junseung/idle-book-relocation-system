export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
        throw new Error(`API 요청 실패: ${path} (status ${res.status})`);
    }
    const json = await res.json();
    if (json.success === false) {
        throw new Error(`API 응답 실패: ${path}`);
    }
    return json;
}

// 개발 중 네트워크 지연을 흉내내고 싶을 때
export function mockDelay<T>(data: T, ms = 300): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}