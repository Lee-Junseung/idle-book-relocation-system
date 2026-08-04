import { apiPost, apiPostWithAuthHeader, ApiError, USE_MOCK } from "./client";
import type { LoginRequest, LoginResponse, LoginResponseBody, RegisterRequest, RegisterResponse } from "../types/auth";
import { loginMock, registerMock } from "./authMock";

// 실제 API는 accessToken을 응답 바디가 아닌 Authorization 응답 헤더(Bearer ...)로 내려주므로, 헤더에서 꺼낸 토큰을 응답 바디와 합쳐서 LoginResponse 형태로 반환한다.
export const loginApi = async (body: LoginRequest): Promise<LoginResponse> => {
    if (USE_MOCK) return loginMock(body);

    const { data, accessToken } = await apiPostWithAuthHeader<LoginResponseBody>("/api/users/login", body);
    if (!accessToken) {
        throw new ApiError("로그인에 성공했지만 인증 토큰을 받지 못했습니다. 잠시 후 다시 시도해 주세요.", 500, "MissingAccessToken");
    }
    return { ...data, accessToken };
};

export const registerApi = (body: RegisterRequest): Promise<RegisterResponse> =>
    USE_MOCK ? registerMock(body) : apiPost("/api/users/register", body);
