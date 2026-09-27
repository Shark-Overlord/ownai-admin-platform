import { getJson } from "@/lib/request";

export type CodexResetKind = "reset" | "reset_card" | "no_reset" | "info";

export interface CodexResetSignal {
  id: string;
  date: string;
  publishedAt?: string | null;
  kind: CodexResetKind;
  status: string;
  label: string;
  summary: string;
  sourceUrl: string;
}

export interface CodexResetAnnouncement {
  id: string;
  publishedAt?: string | null;
  relativeTime: string;
  summary: string;
  sourceUrl: string;
}

export interface CodexResetStats {
  resetCount: number;
  averageIntervalDays: number;
  longestIntervalDays: number;
  latestConfirmedResetAt?: string | null;
}

export interface CodexResetOverview {
  available: boolean;
  stale: boolean;
  message: string;
  sourceName: string;
  sourcePageUrl: string;
  sourceProfileUrl: string;
  sourceHandle: string;
  lastCheckedAt?: string | null;
  latestSignal?: CodexResetSignal | null;
  stats: CodexResetStats;
  history: CodexResetSignal[];
  announcements: CodexResetAnnouncement[];
}

export async function getCodexResetOverview(signal?: AbortSignal) {
  const response = await getJson<CodexResetOverview>("/codex-reset/overview", {
    includeAuthToken: false,
    signal,
  });

  if (response.code !== 0 || !response.data) {
    throw new Error(response.message || "Codex 重置信号加载失败");
  }

  return response.data;
}
