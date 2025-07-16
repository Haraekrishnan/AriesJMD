
'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AchievementsTable from '@/components/achievements/achievements-table';
import AddAchievementDialog from '@/components/achievements/add-achievement-dialog';
import type { Achievement } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { isWithinInterval, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isAfter, isPast } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AchievementsPage() {
  const { users, tasks, achievements, approveAchievement, rejectAchievement, can } = useAppContext();
  const { toast } = useToast();

  const [achievementToApprove, setAchievementToApprove] = useState<Achievement | null>(null);
  const [newPoints, setNewPoints] = useState(0);
  const [rankingFilter, setRankingFilter] = useState('all-time');

  const performanceData = useMemo(() => {
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
    
    const rolesToExclude = ['Manager', 'Admin'];
    const rankedUsers = users.filter(u => !rolesToExclude.includes(u.role));

    return rankedUsers
      .map(u => {
        const tasksInPeriod = dateRange
          ? tasks.filter(t => {
              const dueDate = new Date(t.dueDate);
              return t.assigneeIds.includes(u.id) && isWithinInterval(dueDate, { start: dateRange!.start, end: dateRange!.end });
          })
          : tasks.filter(t => t.assigneeIds.includes(u.id));

        const achievementsInPeriod = dateRange
          ? achievements.filter(a => a.userId === u.id && isWithinInterval(new Date(a.date), { start: dateRange!.start, end: dateRange!.end }))
          : achievements.filter(a => a.userId === u.id);
        
        const completed = tasksInPeriod.filter(t => t.status === 'Done').length;
        
        const overdue = tasksInPeriod.filter(t => {
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
    const performanceUserIds = new Set(performanceData.map(p => p.user.id));
    return achievements.filter(ach => 
        ach.type === 'manual' && 
        ach.status === 'approved' &&
        !performanceUserIds.has(ach.userId)
    );
  }, [achievements, performanceData]);

  const pendingAchievements = useMemo(() => {
    if (!can.manage_achievements) return [];
    return achievements.filter(ach => ach.status === 'pending');
  }, [achievements, can.manage_achievements]);

  const handleApproveClick = (achievement: Achievement) => {
    setAchievementToApprove(achievement);
    setNewPoints(achievement.points);
  };

  const handleConfirmApproval = () => {
    if (achievementToApprove) {
      approveAchievement(achievementToApprove.id, newPoints);
      toast({ title: 'Achievement Approved', description: 'The award has been approved and points are added.' });
      setAchievementToApprove(null);
    }
  };

  const handleReject = (achievementId: string) => {
    rejectAchievement(achievementId);
    toast({ variant: 'destructive', title: 'Achievement Rejected', description: 'The award has been removed.' });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Achievements & Rankings</h1>
          <p className="text-muted-foreground">Recognize top performers and award achievements.</p>
        </div>
        {can.manage_achievements && <AddAchievementDialog />}
      </div>
      
      {can.manage_achievements && pendingAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Achievement Approvals</CardTitle>
            <CardDescription>Review and approve manual awards.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Award</TableHead>
                  <TableHead>Awarded By</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAchievements.map((item) => {
                  const achievementUser = users.find(u => u.id === item.userId);
                  const awardedBy = users.find(u => u.id === item.awardedById);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{achievementUser?.name}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{awardedBy?.name}</TableCell>
                      <TableCell className="text-right">{item.points}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" onClick={() => handleApproveClick(item)}>Approve</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Achievement</AlertDialogTitle>
                              <AlertDialogDescription>
                                You are approving the achievement "{achievementToApprove?.title}" for {users.find(u=>u.id === achievementToApprove?.userId)?.name}. You can adjust the points if needed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                              <Label htmlFor="points">Points</Label>
                              <Input id="points" type="number" value={newPoints} onChange={(e) => setNewPoints(Number(e.target.value))} />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setAchievementToApprove(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmApproval}>Confirm Approval</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(item.id)}>Reject</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
