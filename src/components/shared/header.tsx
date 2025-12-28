
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, ShieldAlert, History, Ship, LogOut, LayoutDashboard, Send, CheckSquare, CalendarCheck, ShoppingCart, Warehouse, ArrowRightLeft, Package, HardHat, Car, CalendarDays, Home, Users, AlertTriangle, Briefcase, TrendingUp, Trophy, User as UserIcon, HelpCircle, Radio, ClipboardList, FileText, Download, MessageSquare, Hammer } from 'lucide-react';
import AnnouncementApprovalDialog from '../announcements/AnnouncementApprovalDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import NewAnnouncementDialog from '../announcements/NewAnnouncementDialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import NewBroadcastDialog from '../announcements/NewBroadcastDialog';
import { isSameDay, parseISO } from 'date-fns';
import type { DailyPlannerComment, PlannerEvent, Comment, LogbookRequest } from '@/lib/types';


const MobileSidebar = ({ onLinkClick }: { onLinkClick: () => void }) => {
    const { 
      user, logout, appName, appLogo, can,
      tasks, certificateRequests, plannerEvents,
      internalRequests, managementRequests, incidentReports,
      ppeRequests, payments, feedback, unlockRequests,
      inventoryTransferRequests, dailyPlannerComments, logbookRequests,
      pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount,
      damageReports
    } = useAppContext();
    const pathname = usePathname();

    const notificationCounts = useMemo(() => {
    if (!user) return {};

    const myFulfilledStoreCertRequestCount = (certificateRequests || []).filter(r => r.requesterId === user.id && r.status === 'Completed' && r.itemId && !r.viewedByRequester).length;
    const myFulfilledEquipmentCertRequests = (certificateRequests || []).filter(r => r.requesterId === user.id && r.status === 'Completed' && (r.utMachineId || r.dftMachineId) && !r.viewedByRequester);

    const isStoreManager = can.approve_store_requests;
    const pendingStoreCertRequestCount = isStoreManager ? (certificateRequests || []).filter(r => r.status === 'Pending' && r.itemId).length : 0;
    const pendingEquipmentCertRequestCount = isStoreManager ? (certificateRequests || []).filter(r => r.status === 'Pending' && (r.utMachineId || r.dftMachineId)).length : 0;
    
const newDelegatedEventsCount = (plannerEvents || []).filter(e =>
  e.userId === user.id &&
  e.creatorId !== user.id &&
  !e.viewedBy?.[user.id]
).length;

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

    const unreadDirectivesCount = (managementRequests || []).filter(d => {
        const isRecipient = d.toUserId === user.id || (d.ccUserIds || []).includes(user.id);
        return isRecipient && !d.readBy?.[user.id];
    }).length;

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
      myRequests: pendingInternalRequestCount + updatedInternalRequestCount + pendingPpeRequestCount + updatedPpeRequestCount,
      manageTasks: myNewTaskCount + pendingTaskApprovalCount + myPendingTaskRequestCount,
      storeInventory: pendingStoreCertRequestCount + myFulfilledStoreCertRequestCount + pendingInventoryTransferRequestCount,
      equipment: pendingEquipmentCertRequestCount + myFulfilledEquipmentCertRequests.length,
      damageReports: can.manage_inventory ? (damageReports || []).filter(r => r.status === 'Pending').length : 0,
      planner: plannerNotificationCount,
      managementRequests: unreadDirectivesCount,
      incidentReporting: incidentNotificationCount,
      vendorLedger: pendingPaymentApprovalCount,
      account: pendingFeedbackCount + pendingUnlockRequestCount,
      manpower: pendingLogbookRequestCount
    };
  }, [
    user, can, tasks, certificateRequests, plannerEvents,
    internalRequests, managementRequests, incidentReports, damageReports,
    ppeRequests, payments, feedback, unlockRequests,
    inventoryTransferRequests, dailyPlannerComments, logbookRequests,
    myNewTaskCount, pendingTaskApprovalCount, myPendingTaskRequestCount
  ]);
    
    const navItems = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', notificationCount: 0, show: true },
      { href: '/my-requests', icon: Send, label: 'My Requests', notificationCount: notificationCounts.myRequests || 0, show: true },
      { href: '/management-requests', icon: MessageSquare, label: 'Management Requests', notificationCount: notificationCounts.managementRequests || 0, show: can.manage_directives },
      { href: '/tasks', icon: CheckSquare, label: 'Manage Tasks', notificationCount: notificationCounts.manageTasks || 0, show: true },
      { href: '/job-schedule', icon: CalendarCheck, label: 'Job Schedule', notificationCount: 0, show: can.manage_job_schedule },
      { href: '/job-record', icon: ClipboardList, label: 'Job Record', notificationCount: 0, show: true },
      { href: '/purchase-register', icon: ShoppingCart, label: 'Purchase Register', notificationCount: 0, show: true },
      { href: '/store-inventory', icon: Warehouse, label: 'Store Inventory', notificationCount: notificationCounts.storeInventory || 0, show: true },
      { href: '/damage-reports', icon: Hammer, label: 'Damage Reports', notificationCount: notificationCounts.damageReports || 0, show: false }, // Changed to false
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
    ];
  
    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1 px-2">
          <ul className="space-y-1 p-2">
            {navItems.map(item => (
              item.show && (
                <li key={item.href}>
                  <Button
                    asChild
                    variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={onLinkClick}
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
        <div className="p-4 mt-auto border-t">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user?.avatar} alt={user?.name} data-ai-hint="user avatar" />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { logout(); onLinkClick(); }} title="Log Out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
};


export default function Header() {
  const { user, appName, appLogo, can } = useAppContext();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  
  const getPageTitle = () => {
    if (pathname.startsWith('/schedule')) return 'Planner';
    if (pathname.startsWith('/tp-certification')) return 'TP Certification Lists';
    const name = pathname.split('/').pop()?.replace(/-/g, ' ');
    if (!name || name === 'app') return 'Dashboard';
    if (name === 'downloads') return 'Forms & Documents';
    if (name === 'management-requests') return 'Management Requests';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const canBroadcast = useMemo(() => {
    if (!can) return false;
    return can.create_broadcast;
  }, [can]);

  return (
    <>
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
      <div className="flex items-center gap-4">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0 bg-card text-card-foreground w-64 border-r">
             <SheetHeader className="p-4 border-b">
                <SheetTitle>
                    <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="flex items-center justify-center h-8 w-8">
                            {appLogo ? (
                                <img src={appLogo} alt={appName} className="h-full w-full object-contain" />
                            ) : (
                                <Ship className="h-8 w-8 text-primary" />
                            )}
                        </div>
                        <h1 className="text-xl font-bold">{appName}</h1>
                    </Link>
                </SheetTitle>
             </SheetHeader>
             <MobileSidebar onLinkClick={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="text-xl md:text-2xl font-bold text-foreground hidden md:block">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center gap-2">
        <AnnouncementApprovalDialog />
        {canBroadcast && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setIsBroadcastOpen(true)}>
                            <Radio />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>New Broadcast</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
        <NewAnnouncementDialog />
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href="/incident-reporting"><ShieldAlert /></Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Incident Reporting</p></TooltipContent>
            </Tooltip>
             {user?.role === 'Admin' && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild>
                        <Link href="/activity-tracker"><History /></Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Activity Tracker</p></TooltipContent>
                </Tooltip>
             )}
        </TooltipProvider>

        <Avatar>
            <AvatarImage src={user?.avatar} alt={user?.name} data-ai-hint="user avatar" />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
    {canBroadcast && <NewBroadcastDialog isOpen={isBroadcastOpen} setIsOpen={setIsBroadcastOpen} />}
    </>
  );
}
