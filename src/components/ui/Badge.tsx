import React from 'react';
import { cn } from '../../lib/utils';
import { ShieldCheck } from 'lucide-react';

export function SecurityBadge({ className, text = "Secure Transaction" }: { className?: string, text?: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-md",
      "bg-[rgba(124,58,237,0.2)] text-[--color-primary] border border-[rgba(124,58,237,0.3)] backdrop-blur-md",
      className
    )}>
      <ShieldCheck className="w-4 h-4" />
      <span>{text}</span>
    </div>
  );
}

export function HeroChip({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider",
      "bg-[--color-surface-container] text-white",
      className
    )}>
      {children}
    </div>
  );
}
