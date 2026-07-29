import { apiPost, USE_MOCK } from "./client";
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from "../types/auth";
import { loginMock, registerMock } from "./authMock";

export const loginApi = (body: LoginRequest): Promise<LoginResponse> =>
    USE_MOCK ? loginMock(body) : apiPost("/api/users/login", body);

export const registerApi = (body: RegisterRequest): Promise<RegisterResponse> =>
    USE_MOCK ? registerMock(body) : apiPost("/api/users/register", body);
