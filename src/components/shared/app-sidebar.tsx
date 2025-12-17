
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
  Download,
} from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { isSameDay, parseISO } from 'date-fns';
import type { DailyPlannerComment, PlannerEvent, Comment, ManagementRequest, LogbookRequest } from '@/lib/types';


export function AppSidebar() {
  const {
    user, logout, appName, appLogo, can,
    tasks, certificateRequests, plannerEvents,
    internalRequests, managementRequests, incidentReports,
    ppeRequests, payments, feedback, unlockRequests,
    inventoryTransferRequests, dailyPlannerComments, logbookRequests,
    pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount,
  } = useAppContext();
  const pathname = usePathname();

  const notificationCounts = useMemo(() => {
    if (!user) return {};

    const myFulfilledStoreCertRequestCount = (certificateRequests || []).filter(r => r.requesterId === user.id && r.status === 'Completed' && r.itemId && !r.viewedByRequester).length;
    const myFulfilledEquipmentCertRequests = (certificateRequests || []).filter(r => r.requesterId === user.id && r.status === 'Completed' && (r.utMachineId || r.dftMachineId) && !r.viewedByRequester);

    const isStoreManager = can.approve_store_requests;
    const pendingStoreCertRequestCount = isStoreManager ? (certificateRequests || []).filter(r => r.status === 'Pending' && r.itemId).length : 0;
    const pendingEquipmentCertRequestCount = isStoreManager ? (certificateRequests || []).filter(r => r.status === 'Pending' && (r.utMachineId || r.dftMachineId)).length : 0;
    
    // NEW: New delegated planner events assigned to me but not viewed
const newDelegatedEventsCount = (plannerEvents || []).filter(e =>
  e.userId === user.id &&          // assigned to me
  e.creatorId !== user.id &&       // created by someone else
  !e.viewedBy?.[user.id]           // I have not viewed it yet
).length;

// Existing unread comments logic
const unreadCommentsForUser = (dailyPlannerComments || []).filter(dayComment => {
    if (!dayComment.day || !dayComment.comments) return false;
    const eventsOnDay = (plannerEvents || []).filter(e => e.date && isSameDay(parseISO(e.date), parseISO(dayComment.day)));
    if (eventsOnDay.length === 0) return false;

    const comments = Array.isArray(dayComment.comments) ? dayComment.comments : Object.values(dayComment.comments);
    return comments.some(c => {
        if (!c) return false;
        const event = eventsOnDay.find(e => e.id === c.eventId);
        if (!event) return false;
        const isParticipant = event.userId === user.id || event.creatorId === user.id;
        return isParticipant && c.userId !== user.id && !c.viewedBy?.[user.id];
    });
});

// FINAL planner notification count
const plannerNotificationCount =
  unreadCommentsForUser.length + newDelegatedEventsCount;


    const pendingInternalRequestCount = isStoreManager ? (internalRequests || []).filter(r => r.status === 'Pending' || r.status === 'Partially Approved').length : 0;
    
    const updatedInternalRequestCount = (internalRequests || []).filter(r => {
        const isMyRequest = r.requesterId === user.id;
        if (!isMyRequest) return false;
        const isRejectedButActive = r.status === 'Rejected' && !r.acknowledgedByRequester;
        const isStandardUpdate = (r.status === 'Approved' || r.status === 'Issued' || r.status === 'Partially Issued' || r.status === 'Partially Approved') && !r.acknowledgedByRequester;
        return isRejectedButActive || isStandardUpdate;
    }).length;

    const isRecipientOfMgmtReq = (req: ManagementRequest) => req.recipientId === user.id;
    const pendingManagementRequestCount = (managementRequests || []).filter(r => r.status === 'Pending' && isRecipientOfMgmtReq(r)).length;
    const updatedManagementRequestCount = (managementRequests || []).filter(r => r.requesterId === user.id && r.status !== 'Pending' && !r.viewedByRequester).length;

    const incidentNotificationCount = (incidentReports || []).filter(i => {
      const isParticipant = i.reporterId === user.id || i.reportedToUserIds.includes(user.id);
      if (!isParticipant) return false;
      
      const hasUnreadUpdate = !i.viewedBy?.[user.id];
      const hasUnreadComment = (i.comments ? Object.values(i.comments) : []).some(c => c.userId !== user.id && !c.viewedBy?.[user.id]);

      return hasUnreadUpdate || hasUnreadComment;
    }).length;
    
    const canApprovePpe = ['Admin', 'Manager'].includes(user.role);
    const canIssuePpe = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'].includes(user.role);
    
    const pendingApproval = canApprovePpe ? (ppeRequests || []).filter(r => r.status === 'Pending').length : 0;
    const pendingIssuance = canIssuePpe ? (ppeRequests || []).filter(r => r.status === 'Approved').length : 0;
    const pendingDisputes = (canApprovePpe || canIssuePpe) ? (ppeRequests || []).filter(r => r.status === 'Disputed').length : 0;
    const pendingPpeRequestCount = pendingApproval + pendingIssuance + pendingDisputes;

    const myPpeRequests = (ppeRequests || []).filter(r => r.requesterId === user.id);
    const ppeQueries = myPpeRequests.filter(req => {
      const comments = req.comments ? (Array.isArray(req.comments) ? req.comments : Object.values(req.comments)) : [];
      const lastComment = comments[comments.length - 1];
      return lastComment && lastComment.userId !== user.id && !req.viewedByRequester;
    }).length;

    const updatedPpeRequestCount = myPpeRequests.filter(r => (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Issued') && !r.viewedByRequester).length + ppeQueries;
    
    const canApprovePayments = user.role === 'Admin' || user.role === 'Manager';
    const pendingPaymentApprovalCount = canApprovePayments ? (payments || []).filter(p => p.status === 'Pending').length : 0;
    const pendingFeedbackCount = can.manage_feedback ? (feedback || []).filter(f => !f.viewedBy?.[user.id]).length : 0;
    const pendingUnlockRequestCount = can.manage_user_lock_status ? (unlockRequests || []).filter(r => r.status === 'pending').length : 0;

    const canApproveTransfers = can.approve_store_requests;
    const pendingInventoryTransferRequestCount = canApproveTransfers ? (inventoryTransferRequests || []).filter(r => r.status === 'Pending' || r.status === 'Disputed').length : 0;

    const pendingLogbookRequestCount = can.manage_logbook ? (logbookRequests || []).filter(r => r.status === 'Pending').length : 0;

    return {
      myRequests: pendingInternalRequestCount + updatedInternalRequestCount + pendingManagementRequestCount + updatedManagementRequestCount + pendingPpeRequestCount + updatedPpeRequestCount,
      manageTasks: myNewTaskCount + pendingTaskApprovalCount + myPendingTaskRequestCount,
      storeInventory: pendingStoreCertRequestCount + myFulfilledStoreCertRequestCount + pendingInventoryTransferRequestCount,
      equipment: pendingEquipmentCertRequestCount + myFulfilledEquipmentCertRequests.length,
      planner: plannerNotificationCount,
      incidentReporting: incidentNotificationCount,
      vendorLedger: pendingPaymentApprovalCount,
      account: pendingFeedbackCount + pendingUnlockRequestCount,
      manpower: pendingLogbookRequestCount
    };
  }, [
    user, can, tasks, certificateRequests, plannerEvents,
    internalRequests, managementRequests, incidentReports,
    ppeRequests, payments, feedback, unlockRequests,
    inventoryTransferRequests, dailyPlannerComments, logbookRequests,
    myNewTaskCount, pendingTaskApprovalCount, myPendingTaskRequestCount
  ]);
  
  const navItems = useMemo(() => [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', notificationCount: 0, show: true },
    { href: '/my-requests', icon: Send, label: 'My Requests', notificationCount: notificationCounts.myRequests || 0, show: true },
    { href: '/tasks', icon: CheckSquare, label: 'Manage Tasks', notificationCount: notificationCounts.manageTasks || 0, show: true },
    { href: '/job-schedule', icon: CalendarCheck, label: 'Job Schedule', notificationCount: 0, show: can.manage_job_schedule },
    { href: '/job-record', icon: ClipboardList, label: 'Job Record', notificationCount: 0, show: true },
    { href: '/purchase-register', icon: ShoppingCart, label: 'Purchase Register', notificationCount: 0, show: true },
    { href: '/store-inventory', icon: Warehouse, label: 'Store Inventory', notificationCount: notificationCounts.storeInventory || 0, show: true },
    { href: '/consumables', icon: Package, label: 'Consumables', notificationCount: 0, show: false },
    { href: '/igp-ogp', icon: ArrowRightLeft, label: 'IGP/OGP Register', notificationCount: 0, show: false },
    { href: '/ppe-stock', icon: Package, label: 'PPE Stock', notificationCount: 0, show: false },
    { href: '/equipment-status', icon: HardHat, label: 'Equipment', notificationCount: notificationCounts.equipment || 0, show: true },
    { href: '/vehicle-status', icon: Car, label: 'Fleet Management', notificationCount: 0, show: true },
    { href: '/schedule', icon: CalendarDays, label: 'Planner', notificationCount: notificationCounts.planner || 0, show: true },
    { href: '/manpower', icon: Users, label: 'Manpower', notificationCount: notificationCounts.manpower || 0, show: true },
    { href: '/accommodation', icon: Home, label: 'Accommodation', notificationCount: 0, show: true },
    { href: '/incident-reporting', icon: AlertTriangle, label: 'Incident Reporting', notificationCount: notificationCounts.incidentReporting || 0, show: true },
    { href: '/downloads', icon: Download, label: 'Forms & Documents', notificationCount: 0, show: true },
    { href: '/vendor-management', icon: Briefcase, label: 'Vendor Ledger', notificationCount: notificationCounts.vendorLedger || 0, show: can.manage_vendors },
    { href: '/performance', icon: TrendingUp, label: 'Performance', notificationCount: 0, show: true },
    { href: '/achievements', icon: Trophy, label: 'Achievements', notificationCount: 0, show: true },
    { href: '/account', icon: UserIcon, label: 'Account', notificationCount: notificationCounts.account || 0, show: true },
    { href: '/help', icon: HelpCircle, label: 'Help', notificationCount: 0, show: true },
    { href: '/tp-certification', icon: FileText, label: 'TP Certification', notificationCount: 0, show: false },
  ], [can, notificationCounts]);

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
