
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, ShieldAlert, History, Ship, LogOut, LayoutDashboard, Send, CheckSquare, CalendarCheck, ShoppingCart, Warehouse, ArrowRightLeft, Package, HardHat, Car, CalendarDays, Home, Users, AlertTriangle, Briefcase, TrendingUp, Trophy, User as UserIcon, HelpCircle, Radio, ClipboardList } from 'lucide-react';
import AnnouncementApprovalDialog from '../announcements/AnnouncementApprovalDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import NewAnnouncementDialog from '../announcements/NewAnnouncementDialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import NewBroadcastDialog from '../announcements/NewBroadcastDialog';

const MobileSidebar = ({ onLinkClick }: { onLinkClick: () => void }) => {
    const { user, logout, appName, appLogo, can, pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, pendingStoreCertRequestCount, myFulfilledStoreCertRequestCount, pendingEquipmentCertRequestCount, myFulfilledEquipmentCertRequests, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount } = useAppContext();
    const pathname = usePathname();
    
    const navItems = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', notificationCount: 0, show: true },
      { href: '/my-requests', icon: Send, label: 'My Requests', notificationCount: pendingInternalRequestCount + updatedInternalRequestCount + pendingManagementRequestCount + updatedManagementRequestCount + pendingPpeRequestCount + updatedPpeRequestCount, show: true },
      { href: '/tasks', icon: CheckSquare, label: 'Manage Tasks', notificationCount: myNewTaskCount + pendingTaskApprovalCount + myPendingTaskRequestCount, show: true },
      { href: '/job-schedule', icon: CalendarCheck, label: 'Job Schedule', notificationCount: 0, show: can.manage_job_schedule },
      { href: '/job-record', icon: ClipboardList, label: 'Job Record', notificationCount: 0, show: can.manage_job_record || ['Document Controller', 'Project Coordinator', 'Manager'].includes(user?.role || '') },
      { href: '/purchase-register', icon: ShoppingCart, label: 'Purchase Register', notificationCount: 0, show: true },
      { href: '/store-inventory', icon: Warehouse, label: 'Store Inventory', notificationCount: pendingStoreCertRequestCount + myFulfilledStoreCertRequestCount, show: true },
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
    const name = pathname.split('/').pop()?.replace(/-/g, ' ');
    if (!name || name === 'app') return 'Dashboard';
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
