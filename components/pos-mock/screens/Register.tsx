'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { MerchFlowMark } from '@/components/brand/MerchFlowLogo';
import { cartTotals, DEFAULT_TAX_RATE, formatCents, type CartLine } from '../math';
import { lineKey, type Catalog, type CatalogItem } from '../catalog';
import { newId, type Action, type PosState } from '../state';
import { cx, DemoBadge, PrimaryButton, SecondaryButton } from '../ui';

export function RegisterTopBar({
  catalog,
  state,
  dispatch,
}: {
  catalog: Catalog;
  state: PosState;
  dispatch: Dispatch<Action>;
}) {
  return (
    <header className="flex h-[64px] shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--card)] px-5">
      <MerchFlowMark className="h-9 w-9 shrink-0 text-[var(--ink)]" title="MerchFlow" />
      <div className="min-w-0">
        <p className="truncate text-[17px] font-semibold leading-tight">{catalog.tourName}</p>
        <p className="truncate text-[14px] leading-tight text-[var(--text2)]">
          {catalog.showName} · Stand A
        </p>
      </div>
      <DemoBadge />
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[14px] text-[var(--text2)]" aria-live="polite">
          {state.sales.length} {state.sales.length === 1 ? 'sale' : 'sales'} this session
        </span>
        <SecondaryButton className="!py-2 text-[15px]" onClick={() => dispatch({ type: 'go', screen: 'countout' })}>
          Close show
        </SecondaryButton>
      </div>
    </header>
  );
}

function priceLabel(item: CatalogItem): string {
  const prices = item.sizes.map((s) => s.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCents(min) : `${formatCents(min)}–${formatCents(max)}`;
}

function sizeLabel(item: CatalogItem): string {
  if (item.sizes.length === 1) return item.sizes[0].size === 'OS' ? 'One size' : item.sizes[0].size;
  return `${item.sizes[0].size}–${item.sizes[item.sizes.length - 1].size}`;
}

function ItemImage({ item }: { item: CatalogItem }) {
  const [failed, setFailed] = useState(false);
  if (!item.imageUrl || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--surface2)] text-[28px] font-bold text-[#c4c6cc]" aria-hidden="true">
        {item.name.slice(0, 1)}
      </div>
    );
  }
  return (
    // Grab-sheet images come from the read-only route; next/image adds nothing for a mock.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full bg-white object-contain p-1" />
  );
}

export function Register({
  catalog,
  state,
  dispatch,
}: {
  catalog: Catalog;
  state: PosState;
  dispatch: Dispatch<Action>;
}) {
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState<CatalogItem | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? catalog.items.filter((i) => `${i.name} ${i.sku} ${i.category}`.toLowerCase().includes(q)) : catalog.items;
  }, [catalog.items, query]);

  const add = (item: CatalogItem, size: string, priceCents: number) => {
    dispatch({
      type: 'add',
      line: { key: lineKey(item.id, size), itemId: item.id, name: item.name, size, sku: item.sku, unitCents: priceCents },
    });
  };

  const open = (item: CatalogItem, button: HTMLButtonElement) => {
    if (item.sizes.length === 1) {
      add(item, item.sizes[0].size, item.sizes[0].priceCents);
      return;
    }
    returnFocus.current = button;
    setPicking(item);
  };

  const closePicker = () => {
    setPicking(null);
    returnFocus.current?.focus();
  };

  return (
    <div className="relative flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Items">
        <div className="flex items-center gap-3 px-5 pb-3 pt-4">
          <h2 data-screen-title tabIndex={-1} className="text-[22px] font-bold outline-none">
            Items
          </h2>
          <span className="text-[14px] text-[var(--muted)]">{catalog.items.length} items</span>
          <label className="ml-auto flex w-[260px] items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 focus-within:outline focus-within:outline-[3px] focus-within:outline-[var(--info)]">
            <span className="sr-only">Search items</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[15px] outline-none"
            />
          </label>
        </div>
        {catalog.items.some((i) => i.samplePrice) && (
          <p className="px-5 pb-2 text-[13px] text-[var(--warn)]">
            The tracker has no retail prices for this tour yet. Prices marked “sample” are placeholders ($40 tees, tanks and shorts; $45 other items).
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {items.length === 0 ? (
            <p className="py-10 text-center text-[var(--muted)]">{query ? `No results for “${query}”` : 'No items available'}</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={(e) => open(item, e.currentTarget)}
                    className="flex h-full w-full flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--card)] text-left hover:border-[#c9cbd0] active:scale-[0.98] motion-reduce:active:scale-100"
                    aria-label={`${item.name}, ${sizeLabel(item)}, ${priceLabel(item)}${item.samplePrice ? ', sample price' : ''}`}
                  >
                    <div className="relative h-[112px] w-full shrink-0 overflow-hidden border-b border-[var(--border)]">
                      <ItemImage item={item} />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <span className="line-clamp-2 text-[14px] font-semibold leading-snug">{item.name}</span>
                      <span className="text-[12px] text-[var(--muted)]">{sizeLabel(item)}</span>
                      <span className="mt-auto flex items-center gap-1.5 pt-1">
                        <span className="text-[15px] font-bold text-[var(--red)]">{priceLabel(item)}</span>
                        {item.samplePrice && (
                          <span className="rounded bg-[var(--warn-bg)] px-1.5 py-[1px] text-[11px] font-semibold text-[var(--warn)]">sample</span>
                        )}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <CartPanel state={state} dispatch={dispatch} />

      {picking && <SizePicker item={picking} onPick={(s, p) => { add(picking, s, p); closePicker(); }} onClose={closePicker} />}
    </div>
  );
}

function SizePicker({
  item,
  onPick,
  onClose,
}: {
  item: CatalogItem;
  onPick: (size: string, priceCents: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button[data-size]')?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.key === 'Tab' && ref.current) {
      // Keep focus inside the sheet.
      const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>('button'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-picker-title"
        onKeyDown={onKeyDown}
        className="w-[460px] rounded-[16px] bg-[var(--card)] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="size-picker-title" className="text-[22px] font-bold">{item.name}</h3>
            <p className="text-[15px] text-[var(--text2)]">Select a size{item.sku ? ` · ${item.sku}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-[16px] font-medium text-[var(--red)]">
            Cancel
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {item.sizes.map((s) => (
            <button
              key={s.size}
              type="button"
              data-size
              onClick={() => onPick(s.size, s.priceCents)}
              className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-4 hover:border-[var(--red)]"
            >
              <span className="block text-[20px] font-bold">{s.size}</span>
              <span className="block text-[14px] text-[var(--text2)]">
                {formatCents(s.priceCents)}
                {item.samplePrice ? ' sample' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CartPanel({ state, dispatch }: { state: PosState; dispatch: Dispatch<Action> }) {
  const totals = cartTotals(state.cart);
  const empty = state.cart.length === 0;
  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--card)]" aria-label="Cart">
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="text-[22px] font-bold">Cart</h2>
        <button
          type="button"
          onClick={() => dispatch({ type: 'clearCart' })}
          disabled={empty}
          className="rounded-md px-2 py-1 text-[15px] font-medium text-[var(--red)] disabled:text-[#b9bcc2]"
        >
          Clear
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5" aria-live="polite">
        {state.lastCompId && empty && (
          <p className="mb-3 rounded-[10px] bg-[var(--success-bg)] px-3 py-2 text-[14px] text-[var(--success)]">
            Comp logged. It counts against stock at count-out.
          </p>
        )}
        {empty ? (
          <div className="py-12 text-center">
            <p className="text-[17px] font-semibold">Cart is empty</p>
            <p className="text-[15px] text-[var(--muted)]">Tap an item to add it</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {state.cart.map((l) => (
              <CartRow key={l.key} line={l} dispatch={dispatch} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1 border-t border-[var(--border)] px-5 py-3 text-[15px]">
        <div className="flex justify-between text-[var(--text2)]">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCents(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-[var(--text2)]">
          <span>Tax ({(DEFAULT_TAX_RATE * 100).toFixed(3)}%)</span>
          <span className="tabular-nums">{formatCents(totals.tax)}</span>
        </div>
        <div className="flex justify-between pt-1 text-[20px] font-bold">
          <span>TOTAL</span>
          <span className="tabular-nums text-[var(--red)]">{formatCents(totals.total)}</span>
        </div>
      </div>
      <div className="space-y-2 px-5 pb-5">
        <PrimaryButton className="w-full !py-4 text-[18px]" disabled={empty} onClick={() => dispatch({ type: 'go', screen: 'method' })}>
          {empty ? 'Charge' : `Charge ${formatCents(totals.total)}`}
        </PrimaryButton>
        <div className="flex gap-2">
          <SecondaryButton className="flex-1 !px-2 !py-2 text-[14px]" disabled={empty} onClick={() => dispatch({ type: 'comp', id: newId(), at: Date.now(), kind: 'gms' })}>
            Log as GMS comp
          </SecondaryButton>
          <SecondaryButton className="flex-1 !px-2 !py-2 text-[14px]" disabled={empty} onClick={() => dispatch({ type: 'comp', id: newId(), at: Date.now(), kind: 'band' })}>
            Log as band comp
          </SecondaryButton>
        </div>
      </div>
    </aside>
  );
}

function CartRow({ line, dispatch }: { line: CartLine; dispatch: Dispatch<Action> }) {
  const label = `${line.name} ${line.size}`;
  return (
    <li className="py-3">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{line.name}</p>
          <p className="text-[13px] text-[var(--muted)]">
            {line.size} · {formatCents(line.unitCents)} each
          </p>
        </div>
        <p className="text-[15px] font-semibold tabular-nums">{formatCents(line.unitCents * line.quantity)}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={`One fewer ${label}`}
          onClick={() => dispatch({ type: 'qty', key: line.key, quantity: line.quantity - 1 })}
          className={cx('h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[18px] leading-none')}
        >
          −
        </button>
        <span className="w-6 text-center tabular-nums" aria-label={`Quantity ${line.quantity}`}>
          {line.quantity}
        </span>
        <button
          type="button"
          aria-label={`One more ${label}`}
          onClick={() => dispatch({ type: 'qty', key: line.key, quantity: line.quantity + 1 })}
          className="h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[18px] leading-none"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'remove', key: line.key })}
          className="ml-auto rounded-md px-2 py-1 text-[14px] text-[var(--red)]"
          aria-label={`Remove ${label}`}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
