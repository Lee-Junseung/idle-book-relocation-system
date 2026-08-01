// 이 배포 인스턴스가 어떤 도서관을 위한 것인지 정의.
// 도서관마다 별도 배포하는 구조이므로, 값은 전부 .env에서 주입받는다.
// (도서관을 바꾸려면 코드가 아니라 .env만 바꾸면 된다.)
export type LibraryId = string;

function requireEnv(key: string, value: string | undefined): string {
    if (!value) {
        throw new Error(
            `환경변수 ${key}가 설정되지 않았습니다. .env 파일을 확인해주세요.`
        );
    }
    return value;
}

export const CURRENT_LIBRARY = {
    id: requireEnv("VITE_LIBRARY_ID", import.meta.env.VITE_LIBRARY_ID) as LibraryId,
    name: requireEnv("VITE_LIBRARY_NAME", import.meta.env.VITE_LIBRARY_NAME),
    address: requireEnv("VITE_LIBRARY_ADDRESS", import.meta.env.VITE_LIBRARY_ADDRESS),
    // 사이드바처럼 공간이 좁은 곳에서 쓰는 축약 주소 (구 단위까지만)
    shortAddress: requireEnv("VITE_LIBRARY_SHORT_ADDRESS", import.meta.env.VITE_LIBRARY_SHORT_ADDRESS),
} as const;