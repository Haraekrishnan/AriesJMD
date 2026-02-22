
'use client';

import { usePathname } from 'next/navigation';
import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Send,
  Warehouse,
  HardHat,
  Car,
  Home,
  CalendarDays,
  User as UserIcon,
  Trophy,
  TrendingUp,
  Briefcase,
  HelpCircle,
  ClipboardList,
  LogOut,
  Ship,
  ArrowLeftRight
} from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
    { href: '/dashboard', hrefV2: '/dashboard/v2', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { href: '/my-requests', hrefV2: '/my-requests/v2', icon: Send, label: 'My Requests', show: true },
    { href: '/tasks', hrefV2: '/tasks/v2', icon: CheckSquare, label: 'Manage Tasks', show: true },
    { href: '/job-progress', hrefV2: '/job-progress/v2', icon: ClipboardList, label: 'JMS Tracker', show: true },
    { href: '/store-inventory', hrefV2: '/store-inventory/v2', icon: Warehouse, label: 'Store Inventory', show: true },
    { href: '/equipment-status', hrefV2: '/equipment-status/v2', icon: HardHat, label: 'Equipment', show: true },
    { href: '/vehicle-status', hrefV2: '/vehicle-status/v2', icon: Car, label: 'Fleet Management', show: true },
    { href: '/planner', hrefV2: '/planner/v2', icon: CalendarDays, label: 'Planner', show: true },
    { href: '/manpower', hrefV2: '/manpower/v2', icon: Users, label: 'Manpower', show: true },
    { href: '/accommodation', hrefV2: '/accommodation/v2', icon: Home, label: 'Accommodation', show: true },
    { href: '/vendor-management', hrefV2: '/vendor-management/v2', icon: Briefcase, label: 'Vendor Ledger', show: true },
    { href: '/performance', hrefV2: '/performance/v2', icon: TrendingUp, label: 'Performance', show: true },
    { href: '/achievements', hrefV2: '/achievements/v2', icon: Trophy, label: 'Achievements', show: true },
    { href: '/account', hrefV2: '/account/v2', icon: UserIcon, label: 'Account', show: true },
    { href: '/help', hrefV2: '/help/v2', icon: HelpCircle, label: 'Help', show: true },
  ];

export function V2AppSidebar() {
  const { user, logout, appName, appLogo } = useAppContext();
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground h-screen fixed">
      <div className="p-4 border-b border-sidebar-foreground/10">
        <Link href="/dashboard/v2" className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10">
                {appLogo ? (
                  <img src={appLogo} alt={appName} className="h-6 w-6 object-contain" />
                ) : (
                  <Ship className="h-6 w-6 text-primary" />
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
                    variant={pathname.startsWith(item.hrefV2) ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-base"
                    >
                    <Link href={item.hrefV2}>
                        <item.icon className="h-5 w-5 mr-3" />
                        <span>{item.label}</span>
                    </Link>
                    </Button>
                </li>
                )
            ))}
            </ul>
        </ScrollArea>
      </div>
      <div className="p-4 mt-auto border-t border-sidebar-foreground/10">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={logout} title="Log Out">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Log Out</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard"><ArrowLeftRight className="h-5 w-5"/></Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Switch to Classic UI</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </aside>
  );
}
