import { Children, useEffect, useRef, useState, type ReactNode } from "react";

interface PromptMasonryProps {
  children: ReactNode;
  getItemHeight?: (index: number) => number;
  maxColumnCount?: number;
  preferredColumnWidth?: number;
}

function getResponsiveColumnCount() {
  if (typeof window === "undefined") {
    return 1;
  }

  if (window.innerWidth >= 1536) {
    return 5;
  }

  if (window.innerWidth >= 1280) {
    return 4;
  }

  if (window.innerWidth >= 1024) {
    return 3;
  }

  if (window.innerWidth >= 640) {
    return 2;
  }

  return 1;
}

function getContainerColumnCount(
  width: number,
  preferredColumnWidth = 364,
  maxColumnCount = Number.POSITIVE_INFINITY,
) {
  if (width < 640) {
    return 1;
  }

  const gap = 12;
  return Math.min(
    maxColumnCount,
    Math.max(2, Math.round((width + gap) / (preferredColumnWidth + gap))),
  );
}

export function PromptMasonry({
  children,
  getItemHeight,
  maxColumnCount,
  preferredColumnWidth,
}: PromptMasonryProps) {
  const [columnCount, setColumnCount] = useState(getResponsiveColumnCount);
  const containerRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const columns = Array.from({ length: columnCount }, () => [] as Array<{
    index: number;
    node: ReactNode;
  }>);
  const columnHeights = Array.from({ length: columnCount }, () => 0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateColumnCount = () => {
      setColumnCount(
        getContainerColumnCount(
          container.clientWidth,
          preferredColumnWidth,
          maxColumnCount,
        ),
      );
    };

    updateColumnCount();
    const resizeObserver = new ResizeObserver(updateColumnCount);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [maxColumnCount, preferredColumnWidth]);

  items.forEach((node, index) => {
    const targetColumn = columnHeights.reduce(
      (shortestIndex, height, currentIndex) =>
        height < columnHeights[shortestIndex] ? currentIndex : shortestIndex,
      0,
    );
    const estimatedHeight = Math.max(getItemHeight?.(index) ?? 1, 0.1);

    columns[targetColumn].push({ index, node });
    columnHeights[targetColumn] += estimatedHeight;
  });

  return (
    <div
      ref={containerRef}
      className="grid w-full items-start gap-3"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-col gap-3">
          {column.map(({ index, node }) => (
            <div key={index}>{node}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
