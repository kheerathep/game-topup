import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type DarkFilterOption = { value: string; label: string };

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DarkFilterOption[];
  className?: string;
  /** inline = ป้ายกับปุ่มอยู่แถวเดียว (แถบเครื่องมือ) */
  layout?: 'stacked' | 'inline';
};

const btnBase =
  'flex items-center justify-between gap-2 rounded-xl border text-left font-medium text-white outline-none transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[--color-primary]/45 focus-visible:ring-2 focus-visible:ring-[--color-primary]/40';

/** ดรอปดาวน์ธีมมืด — อ่านง่ายกว่า select ดั้งเดิมบน Windows (ไม่เป็นพื้นขาวว่าง) */
export function DarkFilterSelect({ id, label, value, onChange, options, className, layout = 'stacked' }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;
  const inline = layout === 'inline';

  return (
    <div ref={root} className={cn('relative', inline && 'flex flex-wrap items-center gap-2 sm:gap-3', className)}>
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-[0.2em] text-[--color-outline-variant]',
          inline ? 'shrink-0 pt-0.5' : 'mb-1.5 block',
        )}
      >
        {label}
      </span>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          btnBase,
          inline
            ? 'min-w-[10.5rem] border-white/12 bg-[--color-surface-container-highest]/90 px-3 py-2 text-sm'
            : 'w-full border-white/15 bg-[--color-surface-container-highest] px-3 py-3 text-sm',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 truncate">{currentLabel}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-[--color-outline-variant] transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          className={cn(
            'absolute z-[100] max-h-56 min-w-full overflow-auto rounded-xl border border-white/12 bg-[#161922] py-1 shadow-[0_20px_48px_rgba(0,0,0,0.65)]',
            inline ? 'right-0 top-[calc(100%+6px)] w-max sm:min-w-[12rem]' : 'left-0 right-0 top-[calc(100%+4px)]',
          )}
          role="listbox"
        >
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={cn(
                  'w-full px-3 py-2.5 text-left text-sm transition-colors',
                  o.value === value
                    ? 'bg-[--color-primary]/20 font-semibold text-[--color-secondary]'
                    : 'text-white/92 hover:bg-white/10',
                )}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
