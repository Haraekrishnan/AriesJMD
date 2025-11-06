
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
import { PpeRequest, ManagementRequest, InternalRequest, CertificateRequest, Task } from '@/lib/types';


export function AppSidebar() {
  const { user, logout, appName, appLogo, can, tasks, certificateRequests, plannerEvents, internalRequests, managementRequests, incidentReports, ppeRequests, payments, passwordResetRequests, feedback, unlockRequests, inventoryTransferRequests } = useAppContext();
  const pathname = usePathname();

  const pendingTaskApprovalCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(t => t.approverId === user.id && t.statusRequest?.status === 'Pending').length;
  }, [user, tasks]);

  const myNewTaskCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(t => t.assigneeIds?.includes(user.id) && !t.viewedBy?.[user.id]).length;
  }, [user, tasks]);

  const myPendingTaskRequestCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(t => (t.statusRequest?.requestedBy === user.id && t.statusRequest?.status === 'Pending') || (t.approvalState === 'returned' && t.assigneeIds?.includes(user.id))).length;
  }, [user, tasks]);

  const myFulfilledStoreCertRequestCount = useMemo(() => {
    if (!user) return 0;
    return certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && r.itemId && !r.viewedByRequester).length;
  }, [user, certificateRequests]);
  
  const myFulfilledEquipmentCertRequests = useMemo(() => {
    if (!user) return [];
    return certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && (r.utMachineId || r.dftMachineId) && !r.viewedByRequester);
  }, [user, certificateRequests]);

  const pendingStoreCertRequestCount = useMemo(() => {
    if (!can.approve_store_requests) return 0;
    return certificateRequests.filter(r => r.status === 'Pending' && r.itemId).length;
  }, [can.approve_store_requests, certificateRequests]);

  const pendingEquipmentCertRequestCount = useMemo(() => {
    if (!can.approve_store_requests) return 0;
    return certificateRequests.filter(r => r.status === 'Pending' && (r.utMachineId || r.dftMachineId)).length;
  }, [can.approve_store_requests, certificateRequests]);
  
  const plannerNotificationCount = useMemo(() => {
    if (!user) return 0;
    
    return plannerEvents.filter(event => {
      const isParticipant = event.userId === user.id || event.creatorId === user.id;
      if (!isParticipant) return false;
      
      const comments = Array.isArray(event.comments) ? event.comments : Object.values(event.comments || {});
      return comments.some(c => c && !c.isRead && c.userId !== user.id);
    }).length;
  }, [user, plannerEvents]);

  const pendingInternalRequestCount = useMemo(() => {
    if (!can.approve_store_requests) return 0;
    return internalRequests.filter(r => r.status === 'Pending' || r.status === 'Partially Approved' || r.status === 'Disputed').length;
  }, [can.approve_store_requests, internalRequests]);
  
  const updatedInternalRequestCount = useMemo(() => {
    if (!user) return 0;
    return internalRequests.filter(r => {
      const isMyRequest = r.requesterId === user.id;
      if (!isMyRequest) return false;
      const isUpdated = r.status === 'Approved' || r.status === 'Issued' || r.status === 'Partially Issued' || r.status === 'Partially Approved' || r.status === 'Rejected';
      return isUpdated && !r.acknowledgedByRequester;
    }).length;
  }, [user, internalRequests]);

  const pendingManagementRequestCount = useMemo(() => {
    if (!user) return 0;
    return managementRequests.filter(r => r.status === 'Pending' && r.recipientId === user.id).length;
  }, [user, managementRequests]);

  const updatedManagementRequestCount = useMemo(() => {
    if (!user) return 0;
    return managementRequests.filter(r => r.requesterId === user.id && r.status !== 'Pending' && !r.viewedByRequester).length;
  }, [user, managementRequests]);

  const incidentNotificationCount = useMemo(() => {
    if (!user) return 0;
    return incidentReports.filter(i => {
      const isParticipant = i.reporterId === user.id || (i.reportedToUserIds && i.reportedToUserIds.includes(user.id));
      const isUnread = !i.viewedBy || !i.viewedBy[user.id];
      return isParticipant && isUnread;
    }).length;
  }, [user, incidentReports]);

  const pendingPpeRequestCount = useMemo(() => {
    if (!user) return 0;
    const canApprovePpe = ['Admin', 'Manager'].includes(user.role);
    const canIssuePpe = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'].includes(user.role);
    
    if (!canApprovePpe && !canIssuePpe) return 0;

    return ppeRequests.filter(r => 
        (canApprovePpe && r.status === 'Pending') ||
        (canIssuePpe && r.status === 'Approved') ||
        (canApprovePpe && r.status === 'Disputed')
    ).length;
  }, [user, ppeRequests]);
  
  const updatedPpeRequestCount = useMemo(() => {
    if (!user) return 0;
    return ppeRequests.filter(r => r.requesterId === user.id && (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Issued') && !r.viewedByRequester).length;
  }, [user, ppeRequests]);

  const pendingPaymentApprovalCount = useMemo(() => {
    if (!user || !['Admin', 'Manager'].includes(user.role)) return 0;
    return payments.filter(p => p.status === 'Pending').length;
  }, [user, payments]);

  const pendingPasswordResetRequestCount = useMemo(() => {
    if (!can.manage_password_resets) return 0;
    return passwordResetRequests.filter(r => r.status === 'pending').length;
  }, [can.manage_password_resets, passwordResetRequests]);

  const pendingFeedbackCount = useMemo(() => {
    if (!user || !can.manage_feedback) return 0;
    return feedback.filter(f => !f.viewedBy || !f.viewedBy[user.id]).length;
  }, [user, can.manage_feedback, feedback]);
  
  const pendingUnlockRequestCount = useMemo(() => {
    if (!can.manage_user_lock_status) return 0;
    return unlockRequests.filter(r => r.status === 'pending').length;
  }, [can.manage_user_lock_status, unlockRequests]);

  const pendingInventoryTransferRequestCount = useMemo(() => {
    if (!can.approve_store_requests) return 0;
    return inventoryTransferRequests.filter(r => r.status === 'Pending' || r.status === 'Disputed').length;
  }, [can.approve_store_requests, inventoryTransferRequests]);


  const navItems = useMemo(() => [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', notificationCount: 0, show: true },
    { href: '/my-requests', icon: Send, label: 'My Requests', notificationCount: pendingInternalRequestCount + updatedInternalRequestCount + pendingManagementRequestCount + updatedManagementRequestCount + pendingPpeRequestCount + updatedPpeRequestCount, show: true },
    { href: '/tasks', icon: CheckSquare, label: 'Manage Tasks', notificationCount: myNewTaskCount + pendingTaskApprovalCount + myPendingTaskRequestCount, show: true },
    { href: '/job-schedule', icon: CalendarCheck, label: 'Job Schedule', notificationCount: 0, show: can.manage_job_schedule },
    { href: '/job-record', icon: ClipboardList, label: 'Job Record', notificationCount: 0, show: true },
    { href: '/purchase-register', icon: ShoppingCart, label: 'Purchase Register', notificationCount: 0, show: true },
    { href: '/store-inventory', icon: Warehouse, label: 'Store Inventory', notificationCount: pendingStoreCertRequestCount + myFulfilledStoreCertRequestCount + pendingInventoryTransferRequestCount, show: true },
    { href: '/igp-ogp', icon: ArrowRightLeft, label: 'IGP/OGP Register', notificationCount: 0, show: true },
    { href: '/ppe-stock', icon: Package, label: 'PPE Stock', notificationCount: 0, show: can.manage_ppe_stock },
    { href: '/equipment-status', icon: HardHat, label: 'Equipment', notificationCount: pendingEquipmentCertRequestCount + myFulfilledEquipmentCertRequests.length, show: true },
    { href: '/vehicle-status', icon: Car, label: 'Fleet Management', notificationCount: 0, show: true },
    { href: '/schedule', icon: CalendarDays, label: 'Planner', notificationCount: plannerNotificationCount, show: true },
    { href: '/manpower', icon: Users, label: 'Manpower', notificationCount: 0, show: true },
    { href: '/accommodation', icon: Home, label: 'Accommodation', notificationCount: 0, show: true },
    { href: '/incident-reporting', icon: AlertTriangle, label: 'Incident Reporting', notificationCount: incidentNotificationCount, show: true },
    { href: '/vendor-management', icon: Briefcase, label: 'Vendor Ledger', notificationCount: pendingPaymentApprovalCount, show: can.manage_vendors },
    { href: '/performance', icon: TrendingUp, label: 'Performance', notificationCount: 0, show: true },
    { href: '/achievements', icon: Trophy, label: 'Achievements', notificationCount: 0, show: true },
    { href: '/account', icon: UserIcon, label: 'Account', notificationCount: pendingPasswordResetRequestCount + pendingFeedbackCount + pendingUnlockRequestCount, show: true },
    { href: '/help', icon: HelpCircle, label: 'Help', notificationCount: 0, show: true },
    { href: '/tp-certification', icon: FileText, label: 'TP Certification', notificationCount: 0, show: false },
  ], [
    can, pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, 
    pendingStoreCertRequestCount, myFulfilledStoreCertRequestCount, 
    pendingEquipmentCertRequestCount, myFulfilledEquipmentCertRequests, 
    plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, 
    pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, 
    pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, 
    pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount
  ]);

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
