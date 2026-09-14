import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResourceHotSortProps = {
  value: number;
  onChange: (value: number) => void;
  appearance?: "native" | "panel";
};

export default function ResourceHotSort({ value, onChange, appearance = "native" }: ResourceHotSortProps) {
  if (appearance === "native") {
    return (
      <label className="inline-flex h-8 items-center gap-2 text-[13px] text-[var(--chat-ink)]">
        排序
        <select
          aria-label="资源排序"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-8 rounded-[7px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-2 text-[13px]"
        >
          <option value={0}>默认</option>
          <option value={7}>热门 · 近7天</option>
          <option value={30}>热门 · 近30天</option>
        </select>
      </label>
    );
  }

  return (
    <div className="inline-flex h-9 items-center gap-2.5 text-[14px] text-[var(--chat-ink)]">
      <span className="font-semibold">排序</span>
      <Select value={String(value)} onValueChange={(nextValue) => onChange(Number(nextValue))}>
        <SelectTrigger
          aria-label="资源排序"
          className="image-studio-chat-select-trigger !h-9 !w-[148px] cursor-pointer !justify-between !rounded-[10px] !border-[var(--chat-border)] !bg-[var(--chat-control-bg)] !px-3 !text-[14px] !font-semibold !text-[var(--chat-ink)] !shadow-none hover:!border-[var(--chat-control-border-strong)] hover:!bg-[var(--chat-control-hover)] focus-visible:!ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          align="start"
          sideOffset={6}
          className="image-studio-chat-select-content resource-hot-sort-content !w-[148px] !min-w-[148px] !rounded-[12px] !border !border-[var(--chat-select-border)] !bg-[var(--chat-select-bg)] !p-1 text-[var(--chat-select-text)] !shadow-[var(--chat-select-shadow)] !backdrop-blur-none"
        >
          <SelectItem className="image-studio-chat-select-item resource-hot-sort-item !min-h-8 !rounded-[8px] !px-3 !py-0 !text-[14px] !font-semibold" value="0">
            最新
          </SelectItem>
          <SelectItem className="image-studio-chat-select-item resource-hot-sort-item !min-h-8 !rounded-[8px] !px-3 !py-0 !text-[14px] !font-semibold" value="7">
            热门
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
