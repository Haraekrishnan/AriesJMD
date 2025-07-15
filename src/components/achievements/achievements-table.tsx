'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Achievement } from '@/types';
import { format } from 'date-fns';

type PerformanceData = {
  user: User;
  score: number;
  completed: number;
  overdue: number;
  planningScore: number;
  awardPoints: number;
};

type TableProps = {
  data: any[];
  type: 'performance' | 'manual';
};

export default function AchievementsTable({ data, type }: TableProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No data available.</p>;
  }

  if (type === 'performance') {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Rank</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Tasks Done</TableHead>
            <TableHead className="text-right">Overdue</TableHead>
            <TableHead className="text-right">Award Pts</TableHead>
            <TableHead className="text-right">Planning Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item: PerformanceData, index: number) => (
            <TableRow key={item.user.id}>
              <TableCell className="font-bold">{index + 1}</TableCell>
              <TableCell>{item.user.name}</TableCell>
              <TableCell className="text-right font-semibold">{item.score}</TableCell>
              <TableCell className="text-right">{item.completed}</TableCell>
              <TableCell className="text-right">{item.overdue > 0 ? <Badge variant="destructive">{item.overdue}</Badge> : 0}</TableCell>
              <TableCell className="text-right">{item.awardPoints}</TableCell>
              <TableCell className="text-right">{item.planningScore}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (type === 'manual') {
    return (
       <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Award</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item: Achievement) => (
            <TableRow key={item.id}>
              <TableCell>{item.userId}</TableCell>
              <TableCell>{item.title}</TableCell>
              <TableCell>{format(new Date(item.date), 'dd MMM, yyyy')}</TableCell>
              <TableCell className="text-right">{item.points}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return null;
}
