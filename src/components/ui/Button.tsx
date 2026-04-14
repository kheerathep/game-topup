import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-gradient-primary text-white hover:glowing-shadow hover:scale-[1.02]': variant === 'primary',
            'bg-transparent ghost-border text-[--color-secondary] hover:bg-[--color-surface-variant]/30': variant === 'secondary',
            'bg-transparent hover:bg-[--color-surface-variant] text-on-background': variant === 'ghost',
            'h-9 px-4 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-11 px-8 text-lg': size === 'lg',
            'h-14 px-10 text-xl': size === 'xl',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
