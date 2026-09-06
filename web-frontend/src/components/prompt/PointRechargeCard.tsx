import { Coins, Minus, Plus, LoaderCircle } from 'lucide-react';
import type { PointRechargeConfig } from '@/lib/member';
import './PointRechargeCard.css';

export function PointRechargeCard({ config, error, quantity, onQuantityChange, busy, creating, onPurchase, onRetry }: {
  config: PointRechargeConfig | null; error: string; quantity: string;
  onQuantityChange: (value: string) => void; busy: boolean; creating: boolean;
  onPurchase: () => void; onRetry: () => void;
}) {
  const count = Number(quantity);
  const valid = Boolean(config && Number.isInteger(count) && count >= 1 && count <= config.maxQuantity);
  const enabled = config?.status === 1;
  const total = config && valid ? (Math.round(Number(config.unitPrice) * 100) * count / 100).toFixed(2) : '—';
  return <section className="point-recharge-card" aria-labelledby="recharge-title">
    <div className="point-recharge-intro">
      <span className="point-recharge-icon"><Coins size={20} aria-hidden="true" /></span>
      <div><h2 id="recharge-title">充值积分</h2><p>按需补充积分，兑换喜欢的提示词与作品</p></div>
    </div>
    {error ? <div role="alert">{error} <button type="button" onClick={onRetry}>重新加载</button></div>
      : !config ? <p role="status">正在加载充值价格</p>
      : !enabled ? <p role="status">积分充值暂未开放</p>
      : <div className="point-recharge-controls">
          <div><p className="point-recharge-label">每份价格</p><p><strong>¥{Number(config.unitPrice).toFixed(2)}</strong><span className="point-recharge-muted"> / {config.pointsPerUnit.toLocaleString()} 积分</span></p></div>
          <div><label htmlFor="recharge-quantity" className="point-recharge-label">购买份数</label>
            <div className="point-recharge-stepper">
              <button type="button" aria-label="减少份数" disabled={busy || count <= 1} onClick={() => onQuantityChange(String(Math.max(1, (Number.isInteger(count) ? count : 1) - 1)))}><Minus size={14} /></button>
              <input id="recharge-quantity" type="number" inputMode="numeric" min={1} max={config.maxQuantity} step={1} value={quantity} disabled={busy} aria-invalid={!valid} aria-describedby={!valid ? 'recharge-quantity-error' : undefined} onChange={(e) => onQuantityChange(e.target.value)} />
              <button type="button" aria-label="增加份数" disabled={busy || count >= config.maxQuantity} onClick={() => onQuantityChange(String(Math.min(config.maxQuantity, (Number.isInteger(count) ? count : 0) + 1)))}><Plus size={14} /></button>
            </div>
            {!valid && <p id="recharge-quantity-error" className="point-recharge-muted">请输入 1–{config.maxQuantity} 的整数</p>}
          </div>
          <div aria-live="polite"><p className="point-recharge-label">到账积分</p><strong>{valid ? (count * config.pointsPerUnit).toLocaleString() : '—'} <small>积分</small></strong></div>
          <button type="button" className="point-recharge-pay" disabled={busy || !valid} onClick={onPurchase}>{creating ? <LoaderCircle size={16} className="animate-spin" /> : `支付宝支付 ¥${total}`}</button>
        </div>}
    <p className="point-recharge-footnote">支付成功后自动到账，可在「我的社区 → 订单」查看充值记录</p>
  </section>;
}
