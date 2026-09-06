import type {
  LoginCaptchaResponse,
  LoginUserVO,
  UserEmailRegisterRequest,
  UserLoginRequest,
  UserRegisterRequest,
} from "@/lib/types";
import {
  clearPersistedLoginUser,
  getPersistedLoginUser,
  persistLoginUser,
  updatePersistedLoginUser,
} from "@/lib/auth-session";
import { getJson, postJson, RequestError } from "@/lib/request";

export async function registerUser(payload: UserRegisterRequest) {
  const result = await postJson<number>("/user/register", payload, {
    includeAuthToken: false,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "注册失败，请稍后重试", {
      code: result.code,
    });
  }

  return result.data;
}

export async function registerUserByEmail(payload: UserEmailRegisterRequest) {
  const result = await postJson<number>("/user/register/email", payload, {
    includeAuthToken: false,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "邮箱注册失败，请稍后重试", {
      code: result.code,
    });
  }

  return result.data;
}

export async function sendRegisterEmailCode(userEmail: string) {
  const result = await postJson<boolean>(
    "/user/register/email/code",
    {
      userEmail,
    },
    {
      includeAuthToken: false,
    },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "验证码发送失败，请稍后重试", {
      code: result.code,
    });
  }

  return result.data;
}

export async function getLoginCaptcha() {
  const result = await getJson<LoginCaptchaResponse>("/user/login/captcha", {
    includeAuthToken: false,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "验证码加载失败，请稍后重试", {
      code: result.code,
    });
  }

  return result.data;
}

export async function loginUser(payload: UserLoginRequest) {
  const result = await postJson<LoginUserVO>("/user/login", payload, {
    includeAuthToken: false,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "登录失败，请稍后重试", {
      code: result.code,
    });
  }

  return result.data;
}

export async function logoutUser() {
  const result = await postJson<boolean>("/user/logout", {});

  if (result.code !== 0) {
    throw new RequestError(result.message || "Logout failed", {
      code: result.code,
    });
  }

  return result.data;
}

export {
  persistLoginUser,
  clearPersistedLoginUser,
  getPersistedLoginUser,
  updatePersistedLoginUser,
};
