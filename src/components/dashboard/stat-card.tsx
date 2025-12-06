
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description: React.ReactNode;
  className?: string;
}

export default function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card className={cn("transition-all duration-300 hover:bg-secondary/50 hover:shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}
