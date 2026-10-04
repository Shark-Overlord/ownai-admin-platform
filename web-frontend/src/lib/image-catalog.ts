import { getJson, RequestError } from "@/lib/request";
import type { HomeTagOption } from "@/lib/types";

interface ImageChannelVO {
  id?: number | string;
  name?: string;
  sort?: number;
  publishedCount?: number | string;
}

interface ImageCatalogVO {
  versionId?: number | string;
  channels?: ImageChannelVO[];
}

export interface ActiveImageCatalog {
  versionId: string;
  channels: HomeTagOption[];
}

export async function getActiveImageCatalog(
  categoryId: string | number,
  assetType = "image_prompt",
  options?: { signal?: AbortSignal },
): Promise<ActiveImageCatalog | null> {
  const result = await getJson<ImageCatalogVO | null>("/imageCatalog/active", {
    includeAuthToken: false,
    query: { categoryId, assetType },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to load image categories", {
      code: result.code,
    });
  }
  if (!result.data?.versionId) {
    return null;
  }

  const channels = (result.data.channels ?? [])
    .map((channel): HomeTagOption | null => {
      const name = channel.name?.trim();
      if (!name || channel.id === null || channel.id === undefined) return null;
      const count = Number(channel.publishedCount ?? 0);
      return {
        id: String(channel.id),
        name,
        sort: channel.sort,
        description: Number.isFinite(count) ? `${count} 个作品` : undefined,
      };
    })
    .filter((channel): channel is HomeTagOption => Boolean(channel))
    .sort((left, right) => (left.sort ?? Number.MAX_SAFE_INTEGER) - (right.sort ?? Number.MAX_SAFE_INTEGER));

  return { versionId: String(result.data.versionId), channels };
}
