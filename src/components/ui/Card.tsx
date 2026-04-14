import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl p-6 text-[--color-on-background]', className)} {...props}>
      {children}
    </div>
  );
}
