import { getJson, postJson, RequestError } from "@/lib/request";
import type { MemberPaymentCreateResult, MemberPaymentStatus, MemberPriceConfigPlan } from "@/lib/types";

export async function listMemberPricePlans(options?: { signal?: AbortSignal }) {
  const result = await getJson<MemberPriceConfigPlan[]>(
    "/member-price-config/plans",
    { ...options, includeAuthToken: false },
  );
  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to load member plans", {
      code: result.code,
    });
  }
  return result.data ?? [];
}

export interface PointRechargeConfig {
  unitPrice: number;
  pointsPerUnit: number;
  maxQuantity: number;
  status: number;
}

export async function getPointRechargeConfig(options?: { signal?: AbortSignal }) {
  const result = await getJson<PointRechargeConfig>("/point/recharge-config", { ...options, includeAuthToken: false });
  if (result.code !== 0 || !result.data) throw new RequestError(result.message || '积分充值配置加载失败', { code: result.code });
  return result.data;
}

export async function createMemberAlipayPayment(planType: "month" | "year" | "lifetime" | "points", requestId: string,
  quote?: { quantity: number; expectedUnitPrice: number; expectedPointsPerUnit: number }) {
  const result = await postJson<MemberPaymentCreateResult>("/member/payment/create", {
    planType,
    requestId,
    ...quote,
  });
  if (result.code !== 0 || !result.data) {
    throw new RequestError(result.message || "Unable to create Alipay checkout", { code: result.code });
  }
  return result.data;
}

export async function resumeMemberAlipayPayment(orderNo: string) {
  const result = await postJson<MemberPaymentCreateResult>("/member/payment/resume", { orderNo });
  if (result.code !== 0 || !result.data) {
    throw new RequestError(result.message || "Unable to resume Alipay checkout", { code: result.code });
  }
  return result.data;
}

export async function getMemberAlipayPaymentStatus(orderNo: string, options?: { signal?: AbortSignal }) {
  const result = await getJson<MemberPaymentStatus>("/member/payment/status", {
    ...options,
    query: { orderNo },
  });
  if (result.code !== 0 || !result.data) {
    throw new RequestError(result.message || "Unable to query payment status", { code: result.code });
  }
  return result.data;
}

export async function getAlipayPaymentResultStatus(
  orderNo: string,
  resultToken: string,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<MemberPaymentStatus>("/payment/alipay/result/status", {
    ...options,
    includeAuthToken: false,
    query: { orderNo, resultToken },
  });
  if (result.code !== 0 || !result.data) {
    throw new RequestError(result.message || "Unable to confirm payment result", { code: result.code });
  }
  return result.data;
}
