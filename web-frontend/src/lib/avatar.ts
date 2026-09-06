import { Avatar, Style } from "@dicebear/core";
import lineFaceDefinition from "@dicebear/styles/line-face.json";

export interface ProfileAvatarOption {
  id: string;
  src: string;
  value: string;
}

const AVATAR_PREFIX = "dicebear:line-face:";
const avatarCache = new Map<string, string>();
const lineFaceStyle = new Style(lineFaceDefinition);

function seedHash(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1
    ? [chroma, x, 0]
    : segment < 2
      ? [x, chroma, 0]
      : segment < 3
        ? [0, chroma, x]
        : segment < 4
          ? [0, x, chroma]
          : segment < 5
            ? [x, 0, chroma]
            : [chroma, 0, x];
  const match = l - chroma / 2;

  return [red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("");
}

function avatarAppearance(seed: string) {
  const hash = seedHash(seed);

  return {
    backgroundColor: hslToHex(hash % 360, 54 + ((hash >>> 9) % 3) * 6, 78 + ((hash >>> 13) % 3) * 4),
    flip: hash % 2 === 0 ? "none" as const : "horizontal" as const,
    rotate: (hash % 7) - 3,
  };
}

function renderDiceBearAvatar(seed: string) {
  const cached = avatarCache.get(seed);

  if (cached) {
    return cached;
  }

  const appearance = avatarAppearance(seed);

  const dataUri = new Avatar(lineFaceStyle, {
    backgroundColor: appearance.backgroundColor,
    backgroundColorFill: "solid",
    flip: appearance.flip,
    rotate: appearance.rotate,
    seed,
    size: 128,
  }).toDataUri();

  avatarCache.set(seed, dataUri);
  return dataUri;
}

export function createProfileAvatarOptions(count = 12) {
  const batchId = `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;

  return Array.from({ length: count }, (_, index): ProfileAvatarOption => {
    const seed = `ownai-${batchId}-${index + 1}`;
    const value = `${AVATAR_PREFIX}${seed}`;

    return {
      id: seed,
      src: renderDiceBearAvatar(seed),
      value,
    };
  });
}

export function createProfileAvatarOption(value?: string | null) {
  const avatarUrl = value?.trim();
  const src = getSafeAvatarUrl(avatarUrl);

  if (!avatarUrl || !src) {
    return undefined;
  }

  const seed = avatarUrl.startsWith(AVATAR_PREFIX)
    ? avatarUrl.slice(AVATAR_PREFIX.length)
    : "current-avatar";

  return { id: seed, src, value: avatarUrl } satisfies ProfileAvatarOption;
}

export function getSafeAvatarUrl(value?: string | null) {
  const avatarUrl = value?.trim();

  if (!avatarUrl) {
    return undefined;
  }

  if (avatarUrl.startsWith(AVATAR_PREFIX)) {
    const seed = avatarUrl.slice(AVATAR_PREFIX.length);

    return seed && /^[a-zA-Z0-9_-]{1,100}$/.test(seed)
      ? renderDiceBearAvatar(seed)
      : undefined;
  }

  if (avatarUrl.startsWith("/") && !avatarUrl.startsWith("//")) {
    return avatarUrl;
  }

  try {
    const parsed = new URL(avatarUrl);
    const isLocalDevelopmentUrl =
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");

    return parsed.protocol === "https:" || isLocalDevelopmentUrl
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
