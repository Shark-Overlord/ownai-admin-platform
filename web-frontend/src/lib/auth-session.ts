import type { LoginUserVO } from "@/lib/types";

const LOGIN_USER_STORAGE_KEY = "designcollect-login-user";
const LOGIN_TOKEN_STORAGE_KEY = "designcollect-login-token";
const TOKEN_FIELD_CANDIDATES = ["token", "accessToken", "access_token"];
const AUTH_SESSION_EVENT = "auth-session-changed";

function extractAuthToken(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of TOKEN_FIELD_CANDIDATES) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function notifyAuthSessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
}

export function persistAuthToken(token?: string | null) {
  if (!token?.trim()) {
    localStorage.removeItem(LOGIN_TOKEN_STORAGE_KEY);
    notifyAuthSessionChange();
    return;
  }

  localStorage.setItem(LOGIN_TOKEN_STORAGE_KEY, token.trim());
  notifyAuthSessionChange();
}

export function getPersistedAuthToken() {
  const token = localStorage.getItem(LOGIN_TOKEN_STORAGE_KEY);

  return token?.trim() || null;
}

export function clearPersistedAuthToken() {
  localStorage.removeItem(LOGIN_TOKEN_STORAGE_KEY);
  notifyAuthSessionChange();
}

export function persistLoginUser(
  user: LoginUserVO,
  options?: { preserveExistingToken?: boolean },
) {
  localStorage.setItem(LOGIN_USER_STORAGE_KEY, JSON.stringify(user));
  const nextToken = extractAuthToken(user);

  if (nextToken) {
    localStorage.setItem(LOGIN_TOKEN_STORAGE_KEY, nextToken);
  } else if (!options?.preserveExistingToken) {
    localStorage.removeItem(LOGIN_TOKEN_STORAGE_KEY);
  }

  notifyAuthSessionChange();
}

export function clearPersistedLoginUser() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("community-session:")) sessionStorage.removeItem(key);
    }
  } catch { /* Session storage is optional. */ }
  localStorage.removeItem(LOGIN_USER_STORAGE_KEY);
  localStorage.removeItem(LOGIN_TOKEN_STORAGE_KEY);
  notifyAuthSessionChange();
}

export function getPersistedLoginUser() {
  const rawValue = localStorage.getItem(LOGIN_USER_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as LoginUserVO;
  } catch {
    return null;
  }
}

export function updatePersistedLoginUser(patch: Partial<LoginUserVO>) {
  const currentUser = getPersistedLoginUser();

  if (!currentUser) {
    return null;
  }

  const nextUser = {
    ...currentUser,
    ...patch,
  };

  persistLoginUser(nextUser, { preserveExistingToken: true });

  return nextUser;
}

export function getAuthSessionEventName() {
  return AUTH_SESSION_EVENT;
}
