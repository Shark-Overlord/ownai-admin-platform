export default function ResourceHotSort({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <label className="inline-flex h-8 items-center gap-2 text-[13px] text-[var(--chat-ink)]">
    排序
    <select aria-label="资源排序" value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 rounded-[7px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-2 text-[13px]">
      <option value={0}>默认</option><option value={7}>热门 · 近7天</option><option value={30}>热门 · 近30天</option>
    </select>
  </label>;
}
