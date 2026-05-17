import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'gray';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  success: 'bg-green-100 text-green-700 ring-green-600/20',
  warning: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-100 text-red-700 ring-red-600/20',
  info: 'bg-sky-100 text-sky-700 ring-sky-600/20',
  purple: 'bg-purple-100 text-purple-700 ring-purple-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const dotClasses: Record<BadgeVariant, string> = {
  default: 'bg-indigo-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  purple: 'bg-purple-500',
  gray: 'bg-slate-400',
};

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotClasses[variant])} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

export function statusToBadgeVariant(status: 'DRAFT' | 'ACTIVE' | 'PAUSED'): BadgeVariant {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PAUSED':
      return 'warning';
    case 'DRAFT':
      return 'gray';
    default:
      return 'gray';
  }
}
