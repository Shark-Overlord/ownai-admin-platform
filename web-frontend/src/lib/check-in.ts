import { getJson, postJson, RequestError } from "@/lib/request";
import type { CheckInResponse, CheckInStatusResponse } from "@/lib/types";

export async function getCheckInStatus() {
  const result = await getJson<CheckInStatusResponse>("/point/check-in/status", {
    includeAuthToken: true,
  });

  if (result.code !== 0 || !result.data) throw new RequestError(result.message || "无法获取签到状态", { code: result.code });
  return result.data;
}

export async function checkInToday() {
  const result = await postJson<CheckInResponse>(
    "/point/check-in",
    {},
    {
      includeAuthToken: true,
    },
  );

  if (result.code !== 0 || !result.data) throw new RequestError(result.message || "签到失败，请重试", { code: result.code });
  return result.data;
}
