

'use client';

import { usePathname } from 'next/navigation';
import React, { useMemo } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  TrendingUp, 
  Trophy, 
  LogOut, 
  Ship,
  Sparkles,
  FileText,
  User as UserIcon,
  History,
  HardHat,
  AlertTriangle,
  Users,
  Send,
  Warehouse,
  Car,
  Home,
  CalendarDays,
  CalendarCheck,
  Package,
  CreditCard,
  Briefcase,
  ShoppingCart,
  ArrowRightLeft,
  HelpCircle,
  ClipboardList,
} from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { isBefore, parseISO, startOfDay } from 'date-fns';

export function AppSidebar() {
  const { 
    user, logout, appName, appLogo, can, 
    tasks, certificateRequests, plannerEvents, internalRequests, 
    managementRequests, incidentReports, ppeRequests, payments, 
    passwordResetRequests, feedback, unlockRequests, inventoryTransferRequests
  } = useAppContext();
  const pathname = usePathname();

  const myRequestsCount = useMemo(() => {
    if (!user) return 0;
    const pendingInternal = internalRequests.filter(r => (can.approve_store_requests && r.status === 'Pending') || (r.requesterId === user.id && r.status !== 'Pending' && !r.acknowledgedByRequester)).length;
    const pendingManagement = managementRequests.filter(r => (r.recipientId === user.id && r.status === 'Pending') || (r.requesterId === user.id && r.status !== 'Pending' && !r.viewedByRequester)).length;
    const pendingPpe = ppeRequests.filter(r => (user.role === 'Admin' || user.role === 'Manager' || user.role === 'Store in Charge') ? (r.status === 'Pending' || r.status === 'Approved') : (r.requesterId === user.id && r.status !== 'Pending' && !r.viewedByRequester)).length;
    return pendingInternal + pendingManagement + pendingPpe;
  }, [user, internalRequests, managementRequests, ppeRequests, can.approve_store_requests]);

  const tasksCount = useMemo(() => {
    if (!user) return 0;
    const myNewTaskCount = tasks.filter(t => t.assigneeIds?.includes(user.id) && !t.viewedBy?.[user.id]).length;
    const pendingTaskApprovalCount = tasks.filter(t => t.approverId === user.id && t.statusRequest?.status === 'Pending').length;
    const myPendingTaskRequestCount = tasks.filter(t => (t.statusRequest?.requestedBy === user.id && t.statusRequest?.status === 'Pending') || (t.approvalState === 'returned' && t.assigneeIds?.includes(user.id))).length;
    return myNewTaskCount + pendingTaskApprovalCount + myPendingTaskRequestCount;
  }, [user, tasks]);

  const inventoryCount = useMemo(() => {
    if (!user) return 0;
    const pendingStoreCert = can.approve_store_requests ? certificateRequests.filter(r => r.status === 'Pending' && r.itemId).length : 0;
    const myFulfilledStoreCert = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && r.itemId && !r.viewedByRequester).length;
    const pendingTransfers = can.approve_store_requests ? inventoryTransferRequests.filter(r => r.status === 'Pending' || r.status === 'Disputed').length : 0;
    return pendingStoreCert + myFulfilledStoreCert + pendingTransfers;
  }, [user, can.approve_store_requests, certificateRequests, inventoryTransferRequests]);
  
  const equipmentCount = useMemo(() => {
    if (!user) return 0;
    const pendingEquipmentCert = can.approve_store_requests ? certificateRequests.filter(r => r.status === 'Pending' && (r.utMachineId || r.dftMachineId)).length : 0;
    const myFulfilledEquipmentCert = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && (r.utMachineId || r.dftMachineId) && !r.viewedByRequester).length;
    return pendingEquipmentCert + myFulfilledEquipmentCert;
  }, [user, can.approve_store_requests, certificateRequests]);
  
  const plannerNotificationCount = useMemo(() => {
    if (!user) return 0;
    const today = startOfDay(new Date());
    let plannerNotifications = 0;
    if (user.lastViewedPlanner && isBefore(parseISO(user.lastViewedPlanner), today)) {
        plannerNotifications = plannerEvents.filter(event => event.userId === user.id && event.creatorId !== user.id).length;
    }
    const commentNotifications = plannerEvents.filter(event => {
        const isParticipant = event.userId === user.id || event.creatorId === user.id;
        if (!isParticipant) return false;
        const comments = Array.isArray(event.comments) ? event.comments : Object.values(event.comments || {});
        return comments.some(c => c && !c.isRead && c.userId !== user.id);
    }).length;
    return plannerNotifications + commentNotifications;
  }, [user, plannerEvents]);
  
  const accountCount = useMemo(() => {
    if (!user) return 0;
    const resets = can.manage_password_resets ? passwordResetRequests.filter(r => r.status === 'pending').length : 0;
    const feedbacks = can.manage_feedback ? feedback.filter(f => !f.viewedBy?.[user.id]).length : 0;
    const unlocks = can.manage_user_lock_status ? unlockRequests.filter(r => r.status === 'pending').length : 0;
    return resets + feedbacks + unlocks;
  }, [user, can.manage_password_resets, can.manage_feedback, can.manage_user_lock_status, passwordResetRequests, feedback, unlockRequests]);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', notificationCount: 0, show: true },
    { href: '/my-requests', icon: Send, label: 'My Requests', notificationCount: myRequestsCount, show: true },
    { href: '/tasks', icon: CheckSquare, label: 'Manage Tasks', notificationCount: tasksCount, show: true },
    { href: '/job-schedule', icon: CalendarCheck, label: 'Job Schedule', notificationCount: 0, show: can.manage_job_schedule },
    { href: '/job-record', icon: ClipboardList, label: 'Job Record', notificationCount: 0, show: true },
    { href: '/purchase-register', icon: ShoppingCart, label: 'Purchase Register', notificationCount: 0, show: can.manage_purchase_register },
    { href: '/store-inventory', icon: Warehouse, label: 'Store Inventory', notificationCount: inventoryCount, show: true },
    { href: '/igp-ogp', icon: ArrowRightLeft, label: 'IGP/OGP Register', notificationCount: 0, show: can.manage_igp_ogp },
    { href: '/ppe-stock', icon: Package, label: 'PPE Stock', notificationCount: 0, show: can.manage_ppe_stock },
    { href: '/equipment-status', icon: HardHat, label: 'Equipment', notificationCount: equipmentCount, show: true },
    { href: '/vehicle-status', icon: Car, label: 'Fleet Management', notificationCount: 0, show: true },
    { href: '/schedule', icon: CalendarDays, label: 'Planner', notificationCount: plannerNotificationCount, show: true },
    { href: '/manpower', icon: Users, label: 'Manpower', notificationCount: 0, show: true },
    { href: '/accommodation', icon: Home, label: 'Accommodation', notificationCount: 0, show: true },
    { href: '/incident-reporting', icon: AlertTriangle, label: 'Incident Reporting', notificationCount: incidentNotificationCount, show: true },
    { href: '/vendor-management', icon: Briefcase, label: 'Vendor Ledger', notificationCount: pendingPaymentApprovalCount, show: can.manage_vendors },
    { href: '/performance', icon: TrendingUp, label: 'Performance', notificationCount: 0, show: true },
    { href: '/achievements', icon: Trophy, label: 'Achievements', notificationCount: 0, show: true },
    { href: '/account', icon: UserIcon, label: 'Account', notificationCount: accountCount, show: true },
    { href: '/help', icon: HelpCircle, label: 'Help', notificationCount: 0, show: true },
    { href: '/activity-tracker', icon: History, label: 'Activity Tracker', notificationCount: 0, show: user?.role === 'Admin'},
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col bg-card text-card-foreground border-r border-border h-screen fixed">
      <div className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8">
                {appLogo ? (
                  <img src={appLogo} alt={appName} className="h-full w-full object-contain" />
                ) : (
                  <Ship className="h-8 w-8 text-primary" />
                )}
            </div>
            <h1 className="text-xl font-bold">{appName}</h1>
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full px-2">
            <ul className="space-y-1 p-2">
            {navItems.map(item => (
                item.show && (
                <li key={item.href}>
                    <Button
                    asChild
                    variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    >
                    <Link href={item.href} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                        </div>
                        {item.notificationCount > 0 && (
                        <Badge variant="destructive" className="h-6 w-6 flex items-center justify-center p-0">{item.notificationCount}</Badge>
                        )}
                    </Link>
                    </Button>
                </li>
                )
            ))}
            </ul>
        </ScrollArea>
      </div>
      <div className="p-4 mt-auto">
        <Separator className="my-4" />
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.avatar} alt={user?.name} data-ai-hint="user avatar" />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Log Out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}



