
'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AddAchievementDialog from '@/components/achievements/add-achievement-dialog';
import AchievementsTable from '@/components/achievements/achievements-table';
import { isWithinInterval, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isAfter, isPast } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AchievementsPage() {
  const { users, tasks, achievements, can } = useAppContext();
  const [rankingFilter, setRankingFilter] = useState('all-time');

  const performanceData = useMemo(() => {
    if (!users || !tasks || !achievements) return [];
    
    const now = new Date();
    let dateRange: { start: Date; end: Date } | null = null;

    if (rankingFilter === 'this-month') {
      dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
    } else if (rankingFilter === 'last-month') {
      const lastMonth = subMonths(now, 1);
      dateRange = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    } else if (rankingFilter === 'this-year') {
      dateRange = { start: startOfYear(now), end: endOfYear(now) };
    }
    
    const rolesToExclude = ['Project Coordinator', 'Admin', 'Manager'];
    const rankedUsers = users.filter(u => !rolesToExclude.includes(u.role));

    return rankedUsers
      .map(u => {
        const tasksInPeriod = dateRange
          ? tasks.filter(t => {
              if (!t.assigneeIds) return false;
              const dueDate = new Date(t.dueDate);
              return t.assigneeIds.includes(u.id) && isWithinInterval(dueDate, { start: dateRange!.start, end: dateRange!.end });
          })
          : tasks.filter(t => t.assigneeIds && t.assigneeIds.includes(u.id));

        const achievementsInPeriod = dateRange
          ? achievements.filter(a => a.userId === u.id && isWithinInterval(new Date(a.date), { start: dateRange!.start, end: dateRange!.end }))
          : achievements.filter(a => a.userId === u.id);
        
        const completed = tasksInPeriod.filter(t => t.status === 'Done').length;
        
        const overdue = tasksInPeriod.filter(t => {
            if (!t.dueDate) return false;
            if (t.completionDate) {
                return isAfter(new Date(t.completionDate), new Date(t.dueDate));
            }
            return t.status !== 'Done' && isPast(new Date(t.dueDate));
        }).length;

        const overduePenalty = overdue * 5;
        
        const manualAchievements = achievementsInPeriod.filter(a => a.type === 'manual' && a.status === 'approved');
        const awardPoints = manualAchievements.reduce((sum, a) => sum + a.points, 0);
        
        const planningScore = u.planningScore || 0;
        
        const performanceScore = (completed * 10) - overduePenalty;

        return {
          user: u,
          score: performanceScore + awardPoints + planningScore,
          completed,
          overdue,
          planningScore,
          awardPoints,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [users, tasks, achievements, rankingFilter]);
  
  const manualAchievements = useMemo(() => {
    if (!achievements) return [];
    return achievements.filter(ach => ach.type === 'manual' && ach.status === 'approved');
  }, [achievements]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Achievements & Rankings</h1>
          <p className="text-muted-foreground">Recognize top performers and award achievements.</p>
        </div>
        {can.manage_achievements && <AddAchievementDialog />}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Performance Index Ranking</CardTitle>
              <CardDescription>Employees ranked by their overall performance score.</CardDescription>
            </div>
            <Select value={rankingFilter} onValueChange={setRankingFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <AchievementsTable data={performanceData} type="performance" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Manual Awards & Recognitions</CardTitle>
          <CardDescription>Special achievements awarded by management.</CardDescription>
        </CardHeader>
        <CardContent>
          <AchievementsTable data={manualAchievements} type="manual" />
        </CardContent>
      </Card>
    </div>
  );
}
