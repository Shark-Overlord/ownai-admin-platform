import { getJson, RequestError } from "@/lib/request";
import type { HomeTagOption, TagVO } from "@/lib/types";

function normalizeTag(tag: TagVO): HomeTagOption | null {
  const normalizedName = tag.name?.trim();

  if (!normalizedName) {
    return null;
  }

  return {
    description: tag.description?.trim() || undefined,
    id: String(tag.id ?? normalizedName),
    name: normalizedName,
    sort: tag.sort ?? undefined,
  };
}

function compareTagOrder(left: HomeTagOption, right: HomeTagOption) {
  const leftSort = left.sort ?? Number.MAX_SAFE_INTEGER;
  const rightSort = right.sort ?? Number.MAX_SAFE_INTEGER;

  if (leftSort !== rightSort) {
    return leftSort - rightSort;
  }

  return left.name.localeCompare(right.name);
}

export async function listTags(options?: { signal?: AbortSignal }) {
  const result = await getJson<TagVO[]>("/tag/list", {
    includeAuthToken: false,
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to load tags", {
      code: result.code,
    });
  }

  return (result.data ?? [])
    .map(normalizeTag)
    .filter((tag): tag is HomeTagOption => Boolean(tag))
    .sort(compareTagOrder);
}
