
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Role } from '@/lib/types';
import { CalendarDays, FileText, Mail, RefreshCw } from 'lucide-react';
import styles from '@/components/dashboard/dashboard.module.css';
import { useAuth } from '@/contexts/auth-provider';
import { useTask } from '@/contexts/task-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, parseISO, isPast, addDays, isBefore, isValid, isAfter, endOfDay } from 'date-fns';
import StatCard from '@/components/dashboard/stat-card';
import { 
    Users, 
    CheckCircle, 
    ListTodo, 
    ShieldAlert, 
    ShieldCheck, 
    Clock, 
    ArrowRight, 
    UserCheck, 
    AlertCircle, 
    AlertTriangle, 
    TrendingUp, 
    Layout, 
    HardHat, 
    Warehouse, 
    ArrowRightLeft, 
    ClipboardCheck, 
    Hammer, 
    MessageSquare,
    Zap,
    PlusCircle,
    Send,
    Bell,
    Inbox,
    Package
} from 'lucide-react';
import TasksCompletedChart from '@/components/dashboard/tasks-completed-chart';
import TeamTaskDistributionChart from '@/components/dashboard/team-task-distribution-chart';
import AnnouncementFeed from '@/components/announcements/AnnouncementFeed';
import RecentPlannerActivity from '@/components/planner/RecentActivity';
import DelegatedEventFeed from '@/components/planner/DelegatedEventFeed';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, getVisibleUsers, markFeatureAsViewed, can } = useAuth();
  const { tasks: allTasks } = useTask();
  const { lastManpowerUpdate, manpowerLogs } = useManpower();
  const { projects, managementRequests } = useGeneral();
  const { jobSchedules, timesheets, jobProgress, documentMovements, trackerNotificationCount } = usePlanner();
  const { ppeRequests, inventoryTransferRequests, inventoryItems, damageReports, internalRequests } = useInventory();

  const teamUsers = useMemo(() => getVisibleUsers(), [getVisibleUsers]);
  const teamUserIds = useMemo(() => new Set(teamUsers.map(u => u.id)), [teamUsers]);

  const teamTasks = useMemo(() => {
    return allTasks.filter(task => {
        if (!task.assigneeIds) return false;
        return task.assigneeIds.some(id => teamUserIds.has(id));
    });
  }, [allTasks, teamUserIds]);

  const canViewAllProjects = useMemo(() => {
    if (!user) return false;
    const globalRoles: Role[] = ['Admin', 'Manager', 'Project Coordinator', 'Store in Charge', 'Assistant Store Incharge', 'Document Controller'];
    return globalRoles.includes(user.role);
  }, [user]);

  // --- ACTION CENTER DATA ---
  const actionCenterData = useMemo(() => {
    if (!user) return null;

    // 1. My Pending Tracker Actions (JMS, TS, Docs)
    const pendingActions = trackerNotificationCount || 0;

    // 2. Unread Management Requests
    const unreadDirectivesCount = (managementRequests || []).filter(d => {
        const isRecipient = d.toUserId === user.id || (d.ccUserIds || []).includes(user.id);
        return isRecipient && !d.readBy?.[user.id];
    }).length;

    // 3. Request Updates (PPE/Store)
    const updatedInternalCount = (internalRequests || []).filter(r => {
        if (r.requesterId !== user.id) return false;
        return !r.acknowledgedByRequester && (r.status === 'Approved' || r.status === 'Issued' || r.status === 'Rejected');
    }).length;

    const myPpeRequests = (ppeRequests || []).filter(r => r.requesterId === user.id);
    const updatedPpeCount = myPpeRequests.filter(r => (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Issued') && !r.viewedByRequester).length;

    return {
        pendingActions,
        unreadDirectives: unreadDirectivesCount,
        requestUpdates: updatedInternalCount + updatedPpeCount,
        totalPersonalAlerts: pendingActions + unreadDirectivesCount + updatedInternalCount + updatedPpeCount
    };
  }, [user, trackerNotificationCount, managementRequests, internalRequests, ppeRequests]);

  const teamPerformance = useMemo(() => {
      return teamUsers.map(member => {
          const memberTasks = allTasks.filter(t => t.assigneeIds?.includes(member.id));
          const completed = memberTasks.filter(t => t.status === 'Done').length;
          
          // Updated overdue logic: Only if status isn't done/pending and end of day has passed
          const overdue = memberTasks.filter(t => {
              if (t.status === 'Done' || t.status === 'Pending Approval') return false;
              if (!t.dueDate) return false;
              const dueDate = parseISO(t.dueDate);
              if (!isValid(dueDate)) return false;
              return isAfter(new Date(), endOfDay(dueDate));
          }).length;

          const total = memberTasks.length;
          const score = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { member, completed, overdue, total, score };
      }).sort((a, b) => {
          const isALocked = a.member.status === 'locked';
          const isBLocked = b.member.status === 'locked';
          if (isALocked !== isBLocked) return isALocked ? 1 : -1;
          return b.score - a.score;
      });
  }, [teamUsers, allTasks]);

  // --- MANAGEMENT SUMMARY DATA ---
  const managementData = useMemo(() => {
    if (!user) return null;

    const isManager = user.role === 'Admin' || user.role === 'Manager' || user.role === 'Project Coordinator';
    const isStoreStaff = user.role === 'Store in Charge' || user.role === 'Assistant Store Incharge';
    const hasTransferAuth = user.canApproveTransfers || can.approve_transfer_requests;

    const pendingPpeApproval = ppeRequests.filter(r => r.status === 'Pending').length;
    const pendingPpeIssuance = ppeRequests.filter(r => r.status === 'Approved').length;

    const pendingTransfers = inventoryTransferRequests.filter(r => r.status === 'Pending' || r.status === 'Disputed').length;
    const pendingDamageReportCount = can.manage_inventory ? (damageReports || []).filter(r => r.status === 'Pending').length : 0;

    const thirtyDaysFromNow = addDays(new Date(), 30);
    
    // EXCLUDE INACTIVE ITEMS FROM ASSET COMPLIANCE COUNTS
    const visibleItems = inventoryItems.filter(item => {
        if (canViewAllProjects) return true;
        return user.projectIds?.includes(item.projectId);
    });

    const activeItems = visibleItems.filter(item => {
        if (item.isArchived || item.status === 'Damaged' || item.status === 'Quarantine' || item.status === 'Moved to another project') return false;
        return true;
    });

    const expiredCount = activeItems.filter(item => {
        const inspDue = item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null;
        const tpDue = item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null;
        return (inspDue && isPast(inspDue)) || (tpDue && isPast(tpDue));
    }).length;

    const expiringSoonCount = activeItems.filter(item => {
        const inspDue = item.inspectionDueDate ? parseISO(item.inspectionDueDate) : null;
        const tpDue = item.tpInspectionDueDate ? parseISO(item.tpInspectionDueDate) : null;
        
        const isExpired = (inspDue && isPast(inspDue)) || (tpDue && isPast(tpDue));
        if (isExpired) return false;

        const inspSoon = inspDue && isBefore(inspDue, thirtyDaysFromNow);
        const tpSoon = tpDue && isBefore(tpDue, thirtyDaysFromNow);
        return inspSoon || tpSoon;
    }).length;

    return {
        show: isManager || isStoreStaff || hasTransferAuth,
        ppe: { pending: pendingPpeApproval, ready: pendingPpeIssuance },
        store: { transfers: pendingTransfers, damage: pendingDamageReportCount },
        compliance: { expired: expiredCount, soon: expiringSoonCount }
    };
  }, [user, can, ppeRequests, inventoryTransferRequests, inventoryItems, damageReports, canViewAllProjects]);

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
      working += (openingManpower + countIn - countOut);
      onLeave += (latestLogForDay?.countOnLeave || 0);
    });
    return { totalWorking: working, totalOnLeave: onLeave };
  }, [manpowerLogs, projects, jobSchedules]);


  const completedTeamTasks = useMemo(() => teamTasks.filter(t => t.status === 'Done').length, [teamTasks]);
  const openTeamTasks = useMemo(() => teamTasks.length - completedTeamTasks, [teamTasks]);
  const activeManpowerToday = totalWorking - totalOnLeave;
  const showEhsNotice = can.access_ehs_portal && !user?.viewedFeatures?.ehs;

  return (
    <div className={styles.dashboard}>
      <header className={styles.welcome}>
        <div><h1>Welcome back, {user?.name || 'team'}!</h1><p>Here's what's happening across your workspace today.</p></div>
        <div className={styles.date}><CalendarDays aria-hidden="true" /><div>{format(new Date(), 'EEEE, d MMM yyyy')}<small>Your workspace at a glance</small></div></div>
      </header>
      <section aria-label="Workspace summary" className={styles.metrics}>
        <StatCard tone="blue" title="Team Completed" value={completedTeamTasks} icon={CheckCircle} description="Tasks finalized by your team" />
        <StatCard tone="green" title="Team Open" value={openTeamTasks} icon={ListTodo} description="In progress or to do" />
        <StatCard tone="purple" title="Active Manpower" value={activeManpowerToday} icon={Users} description={'Currently on leave: ' + totalOnLeave} />
        <StatCard tone="amber" title="Manpower Update" value={lastManpowerUpdate ? format(parseISO(lastManpowerUpdate), 'HH:mm') : 'N/A'} icon={UserCheck} description={lastManpowerUpdate ? formatDistanceToNow(parseISO(lastManpowerUpdate), { addSuffix: true }) : 'No recent updates'} />
      </section>
      {managementData?.show && <section aria-label="Management overview" className={styles.management}>
        {[
          { title: 'PPE Requests', icon: ShieldCheck, items: [
            { label: 'Awaiting Manager Approval', value: managementData.ppe.pending, href: '/my-requests', color: 'red' },
            { label: 'Approved (Ready to Issue)', value: managementData.ppe.ready, href: '/ppe-stock', color: 'blue' }] },
          { title: 'Store & Transfers', icon: Package, items: [
            { label: 'Pending Transfer Requests', value: managementData.store.transfers, href: '/store-inventory', color: 'red' },
            { label: 'Open Damage Reports', value: managementData.store.damage, href: '/damage-reports', color: 'blue' }] },
          { title: 'Asset Compliance', icon: ShieldAlert, items: [
            { label: 'Expired Certifications', value: managementData.compliance.expired, href: '/store-inventory', color: 'red' },
            { label: 'Expiring Soon (30 Days)', value: managementData.compliance.soon, href: '/store-inventory', color: 'amber' }] },
        ].map(({title, icon: Icon, items}) => <article key={title} className={styles.managementCard}>
          <h2><Icon aria-hidden="true" />{title}</h2><div className={styles.pairedStats}>{items.map(item => <Link href={item.href} key={item.label}><strong className={styles[item.color]}>{item.value.toLocaleString()}</strong><span>{item.label}</span></Link>)}</div>
        </article>)}
      </section>}
      <div className={styles.middle}>
        <section className={styles.panel} aria-labelledby="action-heading">
          <div className={styles.panelHeading}><h2 id="action-heading"><Zap aria-hidden="true" />My Action Center</h2><Badge variant={actionCenterData?.totalPersonalAlerts ? 'destructive' : 'secondary'}>{actionCenterData?.totalPersonalAlerts || 0} Alerts</Badge></div>
          <div className={styles.actionBody}>
            <div className={styles.alerts}>
              {[
                { title: 'Pending Signatures', value: actionCenterData?.pendingActions || 0, href: '/job-progress', icon: FileText, tone: 'rose' },
                { title: 'Unread Messages', value: actionCenterData?.unreadDirectives || 0, href: '/management-requests', icon: Mail, tone: 'blue' },
                { title: 'Request Updates', value: actionCenterData?.requestUpdates || 0, href: '/my-requests', icon: RefreshCw, tone: 'purple' },
              ].map(({title,value,href,icon: Icon,tone}) => <Link key={title} href={href} className={cn(styles.alertTile, styles[tone])}><Icon aria-hidden="true" /><div><strong>{value}</strong><span>{title}</span></div></Link>)}
            </div>
            <h3 className={styles.quickHeading}><Layout aria-hidden="true" />Quick Access Hub</h3>
            <div className={styles.quickLinks}>
              {[
                { title: 'New Store Requisition', description: 'Tools & materials', href: '/my-requests', icon: Package },
                { title: 'New PPE Requisition', description: 'Safety equipment', href: '/my-requests', icon: HardHat },
                ...(can.log_manpower ? [{ title: 'Log Manpower', description: 'Daily site count', href: '/manpower', icon: Users }] : []),
                { title: 'Report Incident', description: 'HSE submission', href: '/incident-reporting', icon: ShieldAlert },
              ].map(({title,description,href,icon: Icon}) => <Link href={href} key={title}><Icon aria-hidden="true" /><div><strong>{title}</strong><small>{description}</small></div></Link>)}
            </div>
          </div>
          <footer className={styles.panelFooter}><span><i />Live Operations Mode</span><Link href="/tasks">All Tasks <ArrowRight size={14} /></Link></footer>
        </section>
        <section className={styles.panel} aria-labelledby="team-heading">
          <div className={styles.panelHeading}><h2 id="team-heading"><Users aria-hidden="true" />Team Overview</h2><div className={styles.teamLinks}><small>{teamUsers.length} Members</small><Link href="/performance">View all</Link></div></div>
          <div className={styles.teamScroll} tabIndex={0} aria-label="Team performance table">
            <table className={styles.teamTable}><thead><tr><th>Member</th><th>Role</th><th>Progress</th><th>Status</th></tr></thead><tbody>
              {teamPerformance.map(({member,score,overdue,total}) => <tr key={member.id}>
                <td><div className={styles.member}><Avatar className="h-7 w-7 shrink-0"><AvatarImage src={member.avatar} alt=""/><AvatarFallback>{member.name?.[0]}</AvatarFallback></Avatar><span>{member.name}</span></div></td>
                <td>{member.role}</td><td><div className={styles.progress}><progress max={100} value={score} aria-label={member.name + ': ' + score + '% completed'} /><span>{score}%</span></div></td>
                <td><span className={cn(styles.status, member.status === 'locked' ? styles.neutral : overdue ? styles.rose : styles.green)}>{member.status === 'locked' ? 'Locked' : overdue ? overdue + ' overdue' : total === 0 ? 'No tasks' : score === 100 ? 'Completed' : 'On track'}</span></td>
              </tr>)}
              {!teamPerformance.length && <tr><td colSpan={4} className={styles.empty}>No team members found.</td></tr>}
            </tbody></table>
          </div>
        </section>
      </div>
      <section className={styles.charts} aria-label="Task performance charts"><TasksCompletedChart tasks={teamTasks} /><TeamTaskDistributionChart tasks={teamTasks} /></section>
      {showEhsNotice && <Alert><ShieldAlert className="h-4 w-4"/><AlertTitle>Explore your EHS Portal</AlertTitle><AlertDescription className="flex flex-wrap items-center justify-between gap-3">Manage safety observations, audits and risk assessments.<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => markFeatureAsViewed('ehs')}>Dismiss</Button><Button size="sm" asChild><Link href="/ehs?entry=notifications">Open EHS Portal</Link></Button></div></AlertDescription></Alert>}
      <div className="space-y-4"><DelegatedEventFeed /><AnnouncementFeed /><RecentPlannerActivity /></div>
    </div>
  );
}
