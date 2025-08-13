
'use client';

import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

export function AppSidebar() {
  const { user, logout, appName, appLogo, can, pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, pendingStoreCertRequestCount, myFulfilledStoreCertRequestCount, pendingEquipmentCertRequestCount, myFulfilledEquipmentCertRequests, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount } = useAppContext();
  const pathname = usePathname();
  
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', notificationCount: 0, show: true },
    { href: '/my-requests', icon: Send, label: 'My Requests', notificationCount: pendingInternalRequestCount + updatedInternalRequestCount + pendingManagementRequestCount + updatedManagementRequestCount + pendingPpeRequestCount + updatedPpeRequestCount, show: true },
    { href: '/tasks', icon: CheckSquare, label: 'Manage Tasks', notificationCount: myNewTaskCount + pendingTaskApprovalCount + myPendingTaskRequestCount, show: true },
    { href: '/job-schedule', icon: CalendarCheck, label: 'Job Schedule', notificationCount: 0, show: can.manage_job_schedule },
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
    { href: '/account', icon: UserIcon, label: 'Account', notificationCount: pendingPasswordResetRequestCount, show: true },
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
      <ScrollArea className="flex-1 px-2">
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
