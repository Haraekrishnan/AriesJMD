import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const tones = {
  blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950 dark:to-slate-900',
  green: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-slate-900',
  purple: 'border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-slate-900',
  amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-slate-900',
};
const icons = { blue: 'bg-blue-600', green: 'bg-emerald-500', purple: 'bg-violet-600', amber: 'bg-amber-500' };
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description: ReactNode;
  className?: string;
  tone?: keyof typeof tones;
}
export default function StatCard({ title, value, icon: Icon, description, className, tone = 'blue' }: StatCardProps) {
  return <Card className={cn('flex items-start gap-4 rounded-xl p-5 shadow-none min-w-0', tones[tone], className)}>
    <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm', icons[tone])}><Icon className="h-6 w-6" aria-hidden="true" /></span>
    <div className="min-w-0"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{value}</div><div className="mt-1 text-xs text-muted-foreground">{description}</div></div>
  </Card>;
}
