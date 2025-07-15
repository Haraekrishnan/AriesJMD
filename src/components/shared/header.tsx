
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, ShieldAlert, History } from 'lucide-react';
import { AppSidebar } from './app-sidebar';
import AnnouncementApprovalDialog from '../announcements/AnnouncementApprovalDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import NewAnnouncementDialog from '../announcements/NewAnnouncementDialog';

export default function Header() {
  const { user, roles } = useAppContext();
  const pathname = usePathname();
  
  const getPageTitle = () => {
    const name = pathname.split('/').pop()?.replace('-', ' ');
    if (!name || name === 'app') return 'Dashboard';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0 bg-card text-card-foreground w-64 border-r">
            <SheetHeader>
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            </SheetHeader>
             <AppSidebar />
          </SheetContent>
        </Sheet>
        <h1 className="text-2xl font-bold text-foreground hidden md:block">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center gap-2">
        <AnnouncementApprovalDialog />
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
  );
}
