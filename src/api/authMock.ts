import { mockDelay, ApiError } from "./client";
import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    RegisterResponseUser,
} from "../types/auth";

// 개발 중 로그인 테스트용 임시 계정 (백엔드 없이 화면 확인용)
const MOCK_ACCOUNT = {
    id: "admin",
    password: "admin",
    name: "지형곤",
    email: "test@example.com",
    nickname: "택훈",
    librarianCode: "LIB-00001",
    accessToken: "mock-access-token",
};

// 회원가입 시 등록된 아이디/이메일/사서코드를 기억해서 중복 가입(409) 케이스를 재현하기 위한 임시 저장소
const registeredIds = new Set<string>([MOCK_ACCOUNT.id]);
const registeredEmails = new Set<string>([MOCK_ACCOUNT.email]);
const registeredLibrarianCodes = new Set<string>();
let mockUserSeq = 3;

export const loginMock = ({ username, password }: LoginRequest): Promise<LoginResponse> => {
    if (username !== MOCK_ACCOUNT.id || password !== MOCK_ACCOUNT.password) {
        throw new ApiError("잘못된 아이디 혹은 비밀번호를 입력했습니다.", 401, "Unauthorized");
    }
    return mockDelay({
        message: "로그인 성공",
        name: MOCK_ACCOUNT.name,
        email: MOCK_ACCOUNT.email,
        nickname: MOCK_ACCOUNT.nickname,
        librarianCode: MOCK_ACCOUNT.librarianCode,
        accessToken: MOCK_ACCOUNT.accessToken,
    });
};

export const registerMock = ({ id, password, name, email, nickname, librarianCode }: RegisterRequest): Promise<RegisterResponse> => {
    if (registeredIds.has(id)) {
        throw new ApiError("이미 존재하는 아이디입니다.", 409, "Conflict");
    }
    if (registeredEmails.has(email)) {
        throw new ApiError("이미 존재하는 이메일입니다.", 409, "Conflict");
    }
    if (registeredLibrarianCodes.has(librarianCode)) {
        throw new ApiError("이미 존재하는 사서 번호입니다.", 409, "Conflict");
    }

    registeredIds.add(id);
    registeredEmails.add(email);
    registeredLibrarianCodes.add(librarianCode);
    mockUserSeq += 1;

    const user: RegisterResponseUser = {
        id: mockUserSeq,
        email,
        password: `$2b$10$mockHashedPassword${password.length}`,
        name,
        nickname,
        librarianCode,
        resetCode: null,
        refreshToken: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    return mockDelay({ message: "회원가입 성공", user }, 400);
};
