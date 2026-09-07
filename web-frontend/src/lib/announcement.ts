import { getJson, postJson } from "@/lib/request";
import type { AnnouncementVO, Page } from "@/lib/types";

interface AnnouncementListRequest {
  current: number;
  pageSize: number;
  title?: string;
  type?: string;
}

export async function getUnreadAnnouncementCount() {
  const result = await getJson<number>("/announcement/unread/count", {
    includeAuthToken: true,
  });

  return result.data ?? 0;
}

export async function listAnnouncements(payload: AnnouncementListRequest) {
  const result = await postJson<Page<AnnouncementVO>>(
    "/announcement/list/page",
    payload,
    {
      includeAuthToken: true,
    },
  );

  return result.data;
}

export async function getAnnouncementDetail(id: number | string) {
  const result = await getJson<AnnouncementVO>("/announcement/get", {
    includeAuthToken: true,
    query: { id },
  });

  return result.data;
}

export async function markAnnouncementRead(id: number | string) {
  const result = await postJson<boolean>(
    "/announcement/read",
    { id },
    {
      includeAuthToken: true,
    },
  );

  return result.data;
}

export async function markAllAnnouncementsRead() {
  const result = await postJson<boolean>(
    "/announcement/read/all",
    {},
    {
      includeAuthToken: true,
    },
  );

  return result.data;
}

export async function getPopupAnnouncement(excludedIds: Array<number | string>) {
  const ids = excludedIds
    .map(String)
    .filter((id) => /^\d+$/.test(id) && id !== "0");
  const result = await postJson<AnnouncementVO | null>(
    "/news/popup/candidate",
    { ids },
    { includeAuthToken: true },
  );
  return result.data ?? null;
}

export async function dismissPopupAnnouncement(ids: Array<number | string>) {
  const safeIds = ids
    .map(String)
    .filter((id) => /^\d+$/.test(id) && id !== "0");
  if (!safeIds.length) return true;
  const result = await postJson<boolean>(
    "/news/popup/dismiss",
    { ids: safeIds },
    { includeAuthToken: true },
  );
  return result.data;
}
