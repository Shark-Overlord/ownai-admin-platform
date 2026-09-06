import { getArtworkDetail } from "@/lib/artwork";
import { getJson, postJson, RequestError } from "@/lib/request";
import { getPersistedLoginUser, updatePersistedLoginUser } from "@/lib/auth-session";
import type { ArtworkDetailVO } from "@/lib/types";

const ACCESS_EVENT = "prompt-entitlement-changed";

export function notifyPromptAccess(detail: ArtworkDetailVO) {
  window.dispatchEvent(new CustomEvent(ACCESS_EVENT, { detail }));
}

export function subscribePromptAccess(listener: (detail: ArtworkDetailVO) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<ArtworkDetailVO>).detail);
  window.addEventListener(ACCESS_EVENT, handler);
  return () => window.removeEventListener(ACCESS_EVENT, handler);
}

export async function refreshPointBalance() {
  const owner = getPersistedLoginUser()?.id;
  const result = await getJson<{ pointBalance: number }>("/point/me", { signal: AbortSignal.timeout(15_000) });
  if (owner !== getPersistedLoginUser()?.id) throw new RequestError("登录账号已变化，请重新查询");
  if (result.code !== 0 || typeof result.data?.pointBalance !== "number") {
    throw new RequestError(result.message || "积分余额加载失败", { code: result.code });
  }
  updatePersistedLoginUser({ pointBalance: result.data.pointBalance });
  return result.data.pointBalance;
}

// A timed-out request may already have committed. Always reconcile access before retrying.
export async function redeemPrompt(artworkId: string, expectedPointsPrice: number) {
  let failure: unknown;
  try {
    const result = await postJson<{ id: string; artworkId: string } | null>("/order/create", {
      artworkId: String(artworkId), orderType: "points", expectedPointsPrice,
    }, { signal: AbortSignal.timeout(20_000) });
    if (result.code !== 0) throw new RequestError(result.message || "兑换失败", { code: result.code });
  } catch (error) {
    failure = error;
  }
  const detail = await getArtworkDetail(artworkId, { signal: AbortSignal.timeout(15_000) });
  if (detail?.canAccessPrompt !== true) {
    throw failure || new RequestError("尚未确认解锁，请刷新后重试");
  }
  return detail;
}
