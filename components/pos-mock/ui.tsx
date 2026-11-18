'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { MerchFlowMark } from '@/components/brand/MerchFlowLogo';
import { parseDollars } from './math';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

/** Red primary button, white text (brandButton in iOS). */
export function PrimaryButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'rounded-[10px] bg-[var(--red)] px-6 py-3 text-[16px] font-semibold text-white hover:bg-[var(--red-hover)] active:bg-[var(--red-active)] disabled:bg-[var(--surface2)] disabled:text-[#9ca3af]',
        className
      )}
    >
      {children}
    </button>
  );
}

/** Grey secondary button (brandSecondaryButton in iOS). */
export function SecondaryButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'rounded-[10px] border border-[var(--border)] bg-[var(--surface2)] px-5 py-3 text-[16px] font-medium text-[var(--ink)] hover:bg-[#e8e9ec] disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, selected }: { className?: string; children: ReactNode; selected?: boolean }) {
  return (
    <div
      className={cx(
        'rounded-[12px] bg-[var(--card)]',
        selected ? 'border-2 border-[var(--red)]' : 'border border-[var(--border)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span
      className="rounded-full bg-[var(--red)] px-3 py-[3px] text-[12px] font-semibold tracking-[0.15em] text-white"
      aria-label="Demo mode"
    >
      DEMO
    </span>
  );
}

/** iOS status bar: time, date, wifi and battery. Static. */
export function StatusBar() {
  return (
    <div className="flex h-[28px] shrink-0 items-center justify-between bg-[var(--card)] px-6 text-[13px] font-semibold" aria-hidden="true">
      <span>
        9:41 PM <span className="ml-2 font-medium">Tue Jul 22</span>
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3C13.5 1.4 10.9.3 8 .3S2.5 1.4.5 3.4l1.3 1.3C3.4 3.1 5.6 2.2 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.5L13 6c-1.3-1.3-3.1-2.1-5-2.1S4.3 4.7 3 6l1.3 1.3c1-1 2.3-1.5 3.7-1.5zm0 3.6c-.6 0-1.1.2-1.5.6L8 11.5l1.5-1.5c-.4-.4-.9-.6-1.5-.6z" />
        </svg>
        100%
        <span className="inline-block h-[11px] w-[22px] rounded-[3px] border border-current p-[1px]">
          <span className="block h-full w-full rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  );
}

/** Header with the M mark, a title, step text and a progress bar (OnboardingFlowView). */
export function AppHeader({
  title,
  detail,
  progress,
  demo,
  right,
}: {
  title: string;
  detail?: string;
  /** 0..1, or undefined for no bar. */
  progress?: number;
  demo?: boolean;
  right?: ReactNode;
}) {
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-4 border-b border-[#d9dadd] bg-[var(--card)] px-6">
      <MerchFlowMark className="h-9 w-9 text-[var(--ink)]" title="MerchFlow" />
      <div className="min-w-0">
        <p className="truncate text-[18px] font-semibold leading-tight">{title}</p>
        {detail && <p className="truncate text-[15px] leading-tight text-[var(--text2)]">{detail}</p>}
      </div>
      {demo && <DemoBadge />}
      <div className="ml-auto flex items-center gap-3">
        {right}
        {progress !== undefined && (
          <div
            className="h-[6px] w-[240px] overflow-hidden rounded-full bg-[var(--surface2)]"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="h-full rounded-full bg-[var(--red)]" style={{ width: `${Math.max(progress, 0.08) * 100}%` }} />
          </div>
        )}
      </div>
    </header>
  );
}

/** Title + subtitle at the top of a step (OnboardingStepHeader). The title takes focus on screen change. */
export function StepTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 data-screen-title tabIndex={-1} className="text-[34px] font-bold leading-tight tracking-[-0.01em] outline-none">
        {title}
      </h2>
      {subtitle && <p className="text-[18px] leading-snug text-[var(--text2)]">{subtitle}</p>}
    </div>
  );
}

/** Bottom bar: Back left, secondary and primary right (OnboardingFooter). */
export function Footer({
  onBack,
  backLabel = 'Back',
  secondary,
  primary,
}: {
  onBack?: () => void;
  backLabel?: string;
  secondary?: ReactNode;
  primary?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 px-10 pb-7 pt-3">
      {onBack && <SecondaryButton onClick={onBack}>{backLabel}</SecondaryButton>}
      <div className="ml-auto flex items-center gap-3">
        {secondary}
        {primary}
      </div>
    </div>
  );
}

export function Row({ label, value, strong, tone }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: 'success' | 'warn' | 'danger' | 'red' }) {
  const toneClass =
    tone === 'success' ? 'text-[var(--success)]' : tone === 'warn' ? 'text-[var(--warn)]' : tone === 'danger' ? 'text-[var(--danger)]' : tone === 'red' ? 'text-[var(--red)]' : 'text-[var(--ink)]';
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px]">
      <span className={cx(strong ? 'font-semibold text-[var(--ink)]' : 'text-[var(--text2)]')}>{label}</span>
      <span className={cx('tabular-nums', strong && 'font-bold', toneClass)}>{value}</span>
    </div>
  );
}

export function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cx('rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-5 py-4', accent && 'border-t-[3px] border-t-[var(--red)]')}>
      <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[28px] font-bold tabular-nums">{value}</p>
    </div>
  );
}

/** Dollar text field that reports cents. */
export function MoneyInput({
  id,
  label,
  valueCents,
  onChange,
}: {
  id: string;
  label: string;
  valueCents: number;
  onChange: (cents: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[13px] font-bold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-[10px] bg-[var(--surface2)] px-4 py-3 focus-within:outline focus-within:outline-[3px] focus-within:outline-[var(--info)]">
        <span className="text-[22px] text-[var(--muted)]">$</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          className="w-full bg-transparent text-[22px] font-bold tabular-nums text-[var(--ink)] outline-none placeholder:text-[#9ca3af]"
          // Keyed by value from the parent so quick buttons update the text.
          defaultValue={valueCents ? (valueCents / 100).toFixed(2) : ''}
          onChange={(e) => onChange(parseDollars(e.target.value) ?? 0)}
        />
      </div>
    </div>
  );
}
