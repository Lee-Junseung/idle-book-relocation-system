// 로그인 요청
export interface LoginRequest {
    id: string;
    password: string;
}

// 로그인 응답 (200)
export interface LoginResponse {
    message: string;
    name: string;
    email: string;
    nickname: string;
}

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
