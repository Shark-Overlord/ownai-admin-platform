import { getJson, postJson } from "@/lib/request";

export interface McpAuthCheckVO {
  isLogin: boolean;
  userId?: number;
  userAccount?: string;
  userName?: string;
  userAvatar?: string;
  memberLevel?: string;
  memberPlanType?: string;
  memberExpireTime?: string;
  isEligibleMember: boolean;
  isLifetime?: boolean;
  remainingDays?: number;
}

export interface McpAuthorizeRequest {
  clientName?: string;
  state?: string;
}

export interface McpAuthorizeVO {
  token: string;
  keyId: number;
  state?: string;
}

export async function checkMcpAuthStatus(): Promise<McpAuthCheckVO> {
  const res = await getJson<McpAuthCheckVO>("/mcp/oauth/check", {
    includeAuthToken: true,
  });
  return res.data;
}

export async function authorizeMcp(
  request: McpAuthorizeRequest = {}
): Promise<McpAuthorizeVO> {
  const res = await postJson<McpAuthorizeVO>("/mcp/oauth/authorize", request, {
    includeAuthToken: true,
  });
  return res.data;
}
