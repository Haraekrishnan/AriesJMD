
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, parseISO, isPast } from 'date-fns';
import StatCard from '@/components/dashboard/stat-card';
import { Users, CheckCircle, ListTodo, ShieldAlert, Clock, ArrowRight, UserCheck, AlertCircle, TrendingUp, Layout } from 'lucide-react';
import TasksCompletedChart from '@/components/dashboard/tasks-completed-chart';
import TeamTaskDistributionChart from '@/components/dashboard/team-task-distribution-chart';
import AnnouncementFeed from '@/components/announcements/AnnouncementFeed';
import RecentPlannerActivity from '@/components/planner/RecentActivity';
import DelegatedEventFeed from '@/components/planner/DelegatedEventFeed';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, getVisibleUsers, markFeatureAsViewed, can } = useAuth();
  const { tasks: allTasks } = useTask();
  const { lastManpowerUpdate, manpowerLogs } = useManpower();
  const { projects } = useGeneral();
  const { jobSchedules } = usePlanner();

  const teamUsers = useMemo(() => getVisibleUsers(), [getVisibleUsers]);
  const teamUserIds = useMemo(() => new Set(teamUsers.map(u => u.id)), [teamUsers]);

  const teamTasks = useMemo(() => {
    return allTasks.filter(task => {
        if (!task.assigneeIds) return false;
        return task.assigneeIds.some(id => teamUserIds.has(id));
    });
  }, [allTasks, teamUserIds]);

  const myTasks = useMemo(() => {
    if (!user) return [];
    return allTasks.filter(t => t.assigneeIds?.includes(user.id));
  }, [allTasks, user]);

  const myStats = useMemo(() => {
    const completed = myTasks.filter(t => t.status === 'Done').length;
    const total = myTasks.length;
    const pending = myTasks.filter(t => t.status !== 'Done' && t.status !== 'Pending Approval').length;
    const overdue = myTasks.filter(t => t.status !== 'Done' && isPast(new Date(t.dueDate))).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pending, overdue, percent };
  }, [myTasks]);

  const myPendingList = useMemo(() => {
      return myTasks
        .filter(t => t.status !== 'Done' && t.status !== 'Pending Approval')
        .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 3);
  }, [myTasks]);

  const teamPerformance = useMemo(() => {
      return teamUsers.map(member => {
          const memberTasks = allTasks.filter(t => t.assigneeIds?.includes(member.id));
          const completed = memberTasks.filter(t => t.status === 'Done').length;
          const overdue = memberTasks.filter(t => t.status !== 'Done' && isPast(new Date(t.dueDate))).length;
          const total = memberTasks.length;
          const score = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { member, completed, overdue, total, score };
      }).sort((a,b) => b.score - a.score);
  }, [teamUsers, allTasks]);

  const { totalWorking, totalOnLeave } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const scheduleForToday = jobSchedules.find(s => s.date === todayStr);

    let working = 0;
    let onLeave = 0;

    projects.forEach(project => {
      const latestLogForDay = manpowerLogs
        .filter(log => log.projectId === project.id && log.date === todayStr)
        .sort((a,b) => parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime())[0];
      
      const scheduledCount = scheduleForToday?.items?.filter(item => item.projectId === project.id)
          .reduce((sum, item) => sum + (item.manpowerIds?.length || 0), 0) || 0;

      const openingManpower = latestLogForDay?.openingManpower ?? scheduledCount;
      
      const countIn = latestLogForDay?.countIn || 0;
      const countOut = latestLogForDay?.countOut || 0;
      const dayTotal = openingManpower + countIn - countOut;

      working += dayTotal;
      onLeave += (latestLogForDay?.countOnLeave || 0);
    });
    return { totalWorking: working, totalOnLeave: onLeave };
  }, [manpowerLogs, projects, jobSchedules]);


  const completedTeamTasks = useMemo(() => teamTasks.filter(t => t.status === 'Done').length, [teamTasks]);
  const openTeamTasks = useMemo(() => teamTasks.length - completedTeamTasks, [teamTasks]);
  
  const activeManpowerToday = totalWorking - totalOnLeave;

  const showEhsNotice = can.access_ehs_portal && !user?.viewedFeatures?.ehs;

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}!</h1>
            <p className="text-muted-foreground">Here is an interactive summary of your workspace and team.</p>
        </div>
      </div>

      {showEhsNotice && (
        <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 animate-in fade-in slide-in-from-top-2 duration-500">
          <ShieldAlert className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
            <div>
                <AlertTitle className="text-emerald-900 dark:text-emerald-200 font-bold">New Feature: EHS Portal</AlertTitle>
                <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                    Manage site audits, report incidents, and conduct risk assessments all in one secure place.
                </AlertDescription>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" onClick={() => markFeatureAsViewed('ehs')}>
                    Dismiss
                </Button>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link href="/ehs">Explore Portal</Link>
                </Button>
            </div>
          </div>
        </Alert>
      )}

      <DelegatedEventFeed />
      <AnnouncementFeed />
      <RecentPlannerActivity />

      {/* --- GLOBAL METRICS --- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Team Completed" 
          value={completedTeamTasks.toString()} 
          icon={CheckCircle} 
          description="Tasks finalized by your team"
        />
        <StatCard 
          title="Team Open" 
          value={openTeamTasks.toString()}
          icon={ListTodo}
          description="In-progress or to-do"
        />
        <StatCard 
          title="Active Manpower" 
          value={activeManpowerToday.toString()}
          icon={Users}
          description={`${totalOnLeave} currently on leave`}
        />
        <StatCard 
          title="Manpower Update" 
          value={lastManpowerUpdate ? format(parseISO(lastManpowerUpdate), 'HH:mm') : 'N/A'}
          icon={Clock}
          description={lastManpowerUpdate ? `Updated ${formatDistanceToNow(parseISO(lastManpowerUpdate), { addSuffix: true })}` : 'No recent updates'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* --- MY WORKSPACE --- */}
        <Card className="flex flex-col border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Layout className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">My Productivity</CardTitle>
                    </div>
                    <Badge variant={myStats.overdue > 0 ? "destructive" : "secondary"}>
                        {myStats.overdue} Overdue
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6 flex-1">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Task Completion</span>
                        <span>{myStats.percent}%</span>
                    </div>
                    <Progress value={myStats.percent} className="h-2" />
                    <p className="text-xs text-muted-foreground">{myStats.completed} of {myStats.total} tasks completed</p>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Next Up
                    </h4>
                    {myPendingList.length > 0 ? (
                        <div className="space-y-2">
                            {myPendingList.map(task => (
                                <Link key={task.id} href="/tasks" className="block group">
                                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors flex justify-between items-center">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{task.title}</p>
                                            <p className="text-xs text-muted-foreground">Due: {format(parseISO(task.dueDate), 'dd MMM')}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center border-2 border-dashed rounded-xl bg-muted/20">
                            <p className="text-sm text-muted-foreground">All clear! No pending tasks.</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t p-4 flex justify-center">
                <Button variant="link" asChild className="text-xs font-bold uppercase tracking-widest h-auto py-0">
                    <Link href="/tasks">Open Task Board</Link>
                </Button>
            </CardFooter>
        </Card>

        {/* --- TEAM STATUS --- */}
        <Card className="flex flex-col border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Team Overview</CardTitle>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{teamUsers.length} Members</span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[320px]">
                    <div className="divide-y">
                        {teamPerformance.length > 0 ? teamPerformance.map(({ member, score, overdue, total }) => (
                            <div key={member.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarImage src={member.avatar} />
                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate leading-tight">{member.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{member.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 shrink-0">
                                    <div className="text-right">
                                        <p className="text-sm font-black">{score}%</p>
                                        <p className="text-[9px] uppercase font-bold text-muted-foreground">Done</p>
                                    </div>
                                    <div className="text-right w-16">
                                        <Badge variant={overdue > 0 ? "destructive" : "secondary"} className="h-5 px-1.5 text-[10px] font-black">
                                            {overdue > 0 ? `${overdue} OVERDUE` : 'CLEAR'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                                <Users className="h-10 w-10 opacity-10" />
                                <p className="text-sm font-medium">No team members found.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t p-4 flex justify-center mt-auto">
                <Button variant="link" asChild className="text-xs font-bold uppercase tracking-widest h-auto py-0">
                    <Link href="/performance">View Performance Reports</Link>
                </Button>
            </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <TasksCompletedChart tasks={teamTasks} />
        <TeamTaskDistributionChart tasks={teamTasks} />
      </div>
    </div>
  );
}
