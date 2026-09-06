interface ArtworkAccessFields {
  canAccess?: boolean;
  memberOnly?: number;
}

export type ArtworkAccessState = "public" | "unlocked" | "locked";

function getUrlPathname(value: string) {
  try {
    return new URL(value, "https://design-everything.local").pathname;
  } catch {
    return "";
  }
}

export function isSupportedArtworkCoverUrl(value: string) {
  const normalizedUrl = value.trim();

  return Boolean(
    normalizedUrl &&
      /\.(png|apng|jpe?g|gif|webp|avif)$/i.test(getUrlPathname(normalizedUrl)),
  );
}

export function isSupportedArtworkVideoUrl(value: string) {
  const normalizedUrl = value.trim();

  return Boolean(normalizedUrl && /\.mp4$/i.test(getUrlPathname(normalizedUrl)));
}

export function getArtworkAccessState({
  canAccess,
  memberOnly,
}: ArtworkAccessFields): ArtworkAccessState {
  if (memberOnly !== 1) {
    return "public";
  }

  return canAccess === true ? "unlocked" : "locked";
}

export function getArtworkAccessLabel(accessState: ArtworkAccessState) {
  if (accessState === "locked") {
    return "会员专享";
  }

  if (accessState === "unlocked") {
    return "已解锁";
  }

  return null;
}
