import { useEffect, useState, type ReactNode } from "react";
import { getSafeAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  alt: string;
  className?: string;
  fallback: ReactNode;
  imageClassName?: string;
  src?: string | null;
}

export function UserAvatar({
  alt,
  className,
  fallback,
  imageClassName,
  src,
}: UserAvatarProps) {
  const safeSrc = getSafeAvatarUrl(src);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => setHasImageError(false), [safeSrc]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
    >
      {fallback}
      {safeSrc && !hasImageError ? (
        <img
          alt={alt}
          className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
          src={safeSrc}
          onError={() => setHasImageError(true)}
        />
      ) : null}
    </span>
  );
}
