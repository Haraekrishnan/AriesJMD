

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
  Truck,
  Home,
  CalendarDays,
} from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout, appName, appLogo, pendingTaskApprovalCount, myNewTaskCount, pendingCertRequestCount, myFulfilledCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount } = useAppContext();
  
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', notificationCount: 0 },
    { href: '/my-requests', icon: Send, label: 'My Requests', notificationCount: pendingInternalRequestCount + updatedInternalRequestCount + pendingManagementRequestCount + updatedManagementRequestCount },
    { href: '/tasks', icon: CheckSquare, label: 'Manage Tasks', notificationCount: pendingTaskApprovalCount + myNewTaskCount },
    { href: '/store-inventory', icon: Warehouse, label: 'Store Inventory', notificationCount: pendingCertRequestCount + myFulfilledCertRequestCount },
    { href: '/equipment-status', icon: HardHat, label: 'Equipment Status', notificationCount: 0 },
    { href: '/vehicle-status', icon: Truck, label: 'Fleet Management', notificationCount: 0 },
    { href: '/schedule', icon: CalendarDays, label: 'Schedule', notificationCount: plannerNotificationCount },
    { href: '/manpower', icon: Users, label: 'Manpower', notificationCount: 0 },
    { href: '/accommodation', icon: Home, label: 'Accommodation', notificationCount: 0 },
    { href: '/incident-reporting', icon: AlertTriangle, label: 'Incident Reporting', notificationCount: incidentNotificationCount },
    { href: '/performance', icon: TrendingUp, label: 'Performance', notificationCount: 0 },
    { href: '/achievements', icon: Trophy, label: 'Achievements', notificationCount: 0 },
    { href: '/reports', icon: FileText, label: 'Reports', notificationCount: 0 },
    { href: '/account', icon: UserIcon, label: 'Account', notificationCount: 0 },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col bg-card text-card-foreground border-r border-border h-screen fixed">
      <div className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg flex items-center justify-center">
                {appLogo ? (
                  <img src={appLogo} alt={appName} className="h-6 w-6 object-contain" />
                ) : (
                  <Ship className="h-6 w-6 text-primary-foreground" />
                )}
            </div>
            <h1 className="text-xl font-bold">{appName}</h1>
        </Link>
      </div>
      <nav className="flex-1 px-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.href}>
              <Button
                asChild
                variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                className="w-full justify-start text-base py-6"
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
          ))}
        </ul>
      </nav>
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
)
