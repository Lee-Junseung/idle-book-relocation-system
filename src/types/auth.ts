// 로그인 요청
export interface LoginRequest {
    username: string;
    password: string;
}

// 로그인 응답 바디 (200)
// 실제 API 명세 확인 결과 accessToken은 응답 바디가 아닌 Authorization 응답 헤더(Bearer ...)로 내려옴.
// 이 타입은 서버가 실제로 body에 담아 보내는 필드만 포함한다.
export interface LoginResponseBody {
    message: string;
    name: string;
    email: string;
    nickname: string;
    librarianCode: string; // 점검 리스트 등록 API(ChecklistRegisterRequest.librarianCode)에 그대로 사용됨
}

// loginApi()가 최종적으로 반환하는 형태.
// 응답 헤더에서 추출한 accessToken을 LoginResponseBody에 합쳐서 반환한다 (api/auth.ts 참고).
export type LoginResponse = LoginResponseBody & {
    accessToken: string; // 이후 모든 API 요청의 Authorization 헤더에 사용됨 (api/client.ts 참고)
};

// 회원가입 요청
export interface RegisterRequest {
    id: string;
    password: string;
    name: string;
    email: string;
    nickname: string;
    librarianCode: string; // 프론트의 User.librarianId 에 대응 (백엔드 필드명은 librarianCode)
}

// 회원가입 응답 (200) (user)
export interface RegisterResponseUser {
    id: number;
    email: string;
    password: string; // 해시된 값. 절대 화면에 노출하거나 저장하지 않는다.
    name: string;
    nickname: string;
    librarianCode: string;
    resetCode: string | null;
    refreshToken: string | null;
    createdAt: string;
    updatedAt: string;
}

// 회원가입 응답 (200)
export interface RegisterResponse {
    message: string;
    user: RegisterResponseUser;
}

// 공통 에러 응답
// 400/401/409 등 에러 시 공통 형태 (client.ts의 ApiError로 매핑됨)
export interface ApiErrorBody {
    message: string;
    error: string;
    statusCode: number;
}
