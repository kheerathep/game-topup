import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-bold text-[--color-on-surface-variant]">{label}</label>}
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-md bg-[--color-background] px-3 py-2 text-sm text-[--color-on-background] placeholder:text-[--color-on-surface-variant]/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300',
            'border border-transparent focus:border-[--color-primary]/40 focus:outline-none focus:shadow-[0_0_10px_rgba(124,58,237,0.1)]',
            error && 'border-[--color-error] focus:border-[--color-error]/40',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <span className="text-xs text-[--color-error] mt-1">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
