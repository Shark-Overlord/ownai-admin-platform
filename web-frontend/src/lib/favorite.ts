import {
  normalizeArtworkToSiteItem,
  normalizePromptAssetToSiteItem,
  type PromptAssetResponse,
} from "@/lib/artwork";
import { getJson, postJson, RequestError } from "@/lib/request";
import type { ArtworkVO, Page, SiteItem } from "@/lib/types";

const FAVORITE_PAGE_SIZE = 20;
const FAVORITE_ASSET_TYPE = "image_prompt";
const PROMPT_ASSET_FAVORITE_EVENT = "prompt-asset-favorite-changed";
const ARTWORK_FAVORITE_EVENT = "artwork-favorite-changed";

interface FavoriteMutationRequest {
  promptAssetId: number | string;
}

interface ArtworkFavoriteMutationRequest {
  artworkId: number | string;
}

export interface FavoriteListRequest {
  current: number;
  pageSize?: number;
  searchText?: string;
}

export interface FavoriteListResult {
  current: number;
  hasMore: boolean;
  items: SiteItem[];
  pages: number;
  total: number;
}

export interface PromptAssetFavoriteChange {
  isFavorited: boolean;
  promptAssetId: string;
}

export interface ArtworkFavoriteChange {
  artworkId: string;
  favoriteCount?: number;
  isFavorited: boolean;
}

function getPositiveInteger(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return fallback;
}

function extractFavoriteRecords(data: PromptAssetResponse | null | undefined) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  return data.records ?? [];
}

function getFavoritePageState(
  data: PromptAssetResponse | null | undefined,
  current: number,
  pageSize: number,
  recordCount: number,
) {
  if (Array.isArray(data)) {
    return {
      current,
      pages: current,
      total: data.length,
      hasMore: data.length >= pageSize,
    };
  }

  const total = getPositiveInteger(data?.total, 0);
  const payloadCurrent = getPositiveInteger(data?.current, current);
  const payloadPages = getPositiveInteger(data?.pages, 0);
  const computedPages = total > 0 ? Math.ceil(total / pageSize) : payloadPages;
  const pages = Math.max(payloadPages, computedPages, payloadCurrent);

  return {
    current: payloadCurrent,
    pages,
    total,
    hasMore:
      total > 0
        ? payloadCurrent * pageSize < total
        : payloadCurrent < pages && recordCount > 0,
  };
}

async function mutateFavorite(
  path: string,
  payload: FavoriteMutationRequest,
) {
  const result = await postJson<boolean>(path, {
    promptAssetId: payload.promptAssetId,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to update favorite", {
      code: result.code,
    });
  }

  return result.data;
}

export function addPromptAssetFavorite(promptAssetId: number | string) {
  return mutateFavorite("/promptAsset/favorite/add", { promptAssetId });
}

export function cancelPromptAssetFavorite(promptAssetId: number | string) {
  return mutateFavorite("/promptAsset/favorite/cancel", { promptAssetId });
}

async function mutateArtworkFavorite(
  path: string,
  payload: ArtworkFavoriteMutationRequest,
) {
  const result = await postJson<boolean>(path, {
    artworkId: payload.artworkId,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to update artwork favorite", {
      code: result.code,
    });
  }

  return result.data;
}

export function addArtworkFavorite(artworkId: number | string) {
  return mutateArtworkFavorite("/artwork/favorite/add", { artworkId });
}

export function cancelArtworkFavorite(artworkId: number | string) {
  return mutateArtworkFavorite("/artwork/favorite/cancel", { artworkId });
}

export function notifyArtworkFavoriteChange(change: ArtworkFavoriteChange) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ArtworkFavoriteChange>(ARTWORK_FAVORITE_EVENT, {
      detail: change,
    }),
  );
}

export function subscribeArtworkFavoriteChange(
  callback: (change: ArtworkFavoriteChange) => void,
) {
  const listener = (event: Event) => {
    callback((event as CustomEvent<ArtworkFavoriteChange>).detail);
  };

  window.addEventListener(ARTWORK_FAVORITE_EVENT, listener);

  return () => {
    window.removeEventListener(ARTWORK_FAVORITE_EVENT, listener);
  };
}

export function notifyPromptAssetFavoriteChange(
  change: PromptAssetFavoriteChange,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PromptAssetFavoriteChange>(PROMPT_ASSET_FAVORITE_EVENT, {
      detail: change,
    }),
  );
}

export function subscribePromptAssetFavoriteChange(
  callback: (change: PromptAssetFavoriteChange) => void,
) {
  const listener = (event: Event) => {
    callback((event as CustomEvent<PromptAssetFavoriteChange>).detail);
  };

  window.addEventListener(PROMPT_ASSET_FAVORITE_EVENT, listener);

  return () => {
    window.removeEventListener(PROMPT_ASSET_FAVORITE_EVENT, listener);
  };
}

export async function checkPromptAssetFavorite(
  promptAssetId: number | string,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<boolean>("/promptAsset/favorite/check", {
    query: { promptAssetId },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to check favorite", {
      code: result.code,
    });
  }

  return Boolean(result.data);
}

export async function checkArtworkFavorite(
  artworkId: number | string,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<boolean>("/artwork/favorite/check", {
    query: { artworkId },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to check artwork favorite", {
      code: result.code,
    });
  }

  return Boolean(result.data);
}

export async function listMyPromptAssetFavorites(
  request: FavoriteListRequest,
  options?: { signal?: AbortSignal },
) {
  const current = request.current;
  const pageSize = request.pageSize ?? FAVORITE_PAGE_SIZE;
  const searchText = request.searchText?.trim();
  const result = await postJson<PromptAssetResponse>(
    "/promptAsset/favorite/my/list/page",
    {
      current,
      pageSize,
      assetType: FAVORITE_ASSET_TYPE,
      ...(searchText ? { searchText } : {}),
    },
    { signal: options?.signal },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to load favorites", {
      code: result.code,
    });
  }

  const records = extractFavoriteRecords(result.data);
  const pageState = getFavoritePageState(
    result.data,
    current,
    pageSize,
    records.length,
  );

  return {
    current: pageState.current,
    pages: pageState.pages,
    total: pageState.total,
    items: records.map(normalizePromptAssetToSiteItem),
    hasMore: pageState.hasMore,
  } satisfies FavoriteListResult;
}

export async function listMyArtworkFavorites(
  request: FavoriteListRequest,
  options?: { signal?: AbortSignal },
) {
  const current = request.current;
  const pageSize = request.pageSize ?? FAVORITE_PAGE_SIZE;
  const result = await postJson<Page<ArtworkVO>>(
    "/artwork/favorite/my/list/page",
    {
      current,
      pageSize,
    },
    { signal: options?.signal },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to load artwork favorites", {
      code: result.code,
    });
  }

  const records = result.data?.records ?? [];
  const pageState = getFavoritePageState(
    result.data,
    current,
    pageSize,
    records.length,
  );

  return {
    current: pageState.current,
    pages: pageState.pages,
    total: pageState.total,
    items: records.map(normalizeArtworkToSiteItem),
    hasMore: pageState.hasMore,
  } satisfies FavoriteListResult;
}
