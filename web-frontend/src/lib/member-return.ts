const MEMBER_RETURN_PATH_KEY = "ownai:member:returnPath";

export function normalizeMemberReturnPath(value?: string | null) {
  if (!value || !value.startsWith("/tutorials/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export function persistMemberReturnPath(value?: string | null) {
  const path = normalizeMemberReturnPath(value);
  if (path) window.localStorage.setItem(MEMBER_RETURN_PATH_KEY, path);
  return path;
}

export function getMemberReturnPath() {
  return normalizeMemberReturnPath(window.localStorage.getItem(MEMBER_RETURN_PATH_KEY));
}

export function clearMemberReturnPath() {
  window.localStorage.removeItem(MEMBER_RETURN_PATH_KEY);
}
