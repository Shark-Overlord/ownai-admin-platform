import { getJson, RequestError } from "@/lib/request";
import type { CategoryVO, HomeCategoryOption, HomeTagOption, TagVO } from "@/lib/types";

function normalizeCategory(category: CategoryVO): HomeCategoryOption | null {
  const normalizedName = category.name?.trim();

  if (!normalizedName) {
    return null;
  }

  return {
    description: category.description?.trim() || undefined,
    id: String(category.id ?? normalizedName),
    name: normalizedName,
    sort: category.sort ?? undefined,
  };
}

function compareCategoryOrder(
  left: HomeCategoryOption,
  right: HomeCategoryOption,
) {
  const leftSort = left.sort ?? Number.MAX_SAFE_INTEGER;
  const rightSort = right.sort ?? Number.MAX_SAFE_INTEGER;

  if (leftSort !== rightSort) {
    return leftSort - rightSort;
  }

  return left.name.localeCompare(right.name);
}

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

function getCategoryTags(category: CategoryVO) {
  return (category.tags ?? [])
    .map(normalizeTag)
    .filter((tag): tag is HomeTagOption => Boolean(tag))
    .sort(compareTagOrder);
}

export async function listCategories(options?: { signal?: AbortSignal }) {
  const result = await getJson<CategoryVO[]>("/category/list", {
    includeAuthToken: false,
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to load categories", {
      code: result.code,
    });
  }

  return (result.data ?? [])
    .map(normalizeCategory)
    .filter((category): category is HomeCategoryOption => Boolean(category))
    .sort(compareCategoryOrder);
}

export async function listCategoryTree(options?: { signal?: AbortSignal }) {
  const result = await getJson<CategoryVO[]>("/category/tree", {
    includeAuthToken: false,
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to load category tree", {
      code: result.code,
    });
  }

  const tagMap = new Map<string, HomeTagOption[]>();
  const categories = (result.data ?? [])
    .map((category) => {
      const normalizedCategory = normalizeCategory(category);

      if (normalizedCategory) {
        tagMap.set(normalizedCategory.name, getCategoryTags(category));
      }

      return normalizedCategory;
    })
    .filter((category): category is HomeCategoryOption => Boolean(category))
    .sort(compareCategoryOrder);

  return {
    categories,
    tagMap,
  };
}

export async function listCategoryTags(
  categoryId: string | number,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<TagVO[]>("/category/tags", {
    includeAuthToken: false,
    query: {
      categoryId,
    },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Failed to load category tags", {
      code: result.code,
    });
  }

  return (result.data ?? [])
    .map(normalizeTag)
    .filter((tag): tag is HomeTagOption => Boolean(tag))
    .sort(compareTagOrder);
}
