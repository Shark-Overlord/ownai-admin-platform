import { RequestError, getJson, postJson, uploadFile } from "@/lib/request";
import type {
  LoginUserVO,
  MemberOrder,
  MemberOrderQueryRequest,
  Page,
  ProfileUpdateRequest,
  UserProfileDetail,
} from "@/lib/types";

export async function getCurrentLoginUser(options?: { signal?: AbortSignal }) {
  const result = await getJson<LoginUserVO>("/user/get/login", {
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to load profile", {
      code: result.code,
    });
  }

  return result.data as UserProfileDetail;
}

export async function updateMyProfile(
  payload: ProfileUpdateRequest,
  options?: { signal?: AbortSignal },
) {
  const result = await postJson<boolean>("/user/update/my", payload, {
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to update profile", {
      code: result.code,
    });
  }

  return result.data;
}

export async function uploadProfileAvatar(
  file: File,
  options?: { signal?: AbortSignal },
) {
  const result = await uploadFile<string>("/file/upload", file, {
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to upload avatar", {
      code: result.code,
    });
  }

  return result.data;
}

export async function listMyMemberOrders(
  payload: MemberOrderQueryRequest,
  options?: { signal?: AbortSignal },
) {
  const result = await postJson<Page<MemberOrder>>(
    "/member/order/my/list/page",
    payload,
    {
      signal: options?.signal,
    },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to load orders", {
      code: result.code,
    });
  }

  return result.data;
}
