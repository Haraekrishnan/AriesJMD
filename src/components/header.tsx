'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Home,
  LogOut,
  User as UserIcon,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NAV_LINKS } from '@/lib/constants';
import { useAppContext } from '@/contexts/app-provider';
import { Skeleton } from './ui/skeleton';

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard';
  for (const link of NAV_LINKS) {
    if (link.href === pathname) return link.label;
    if (link.subLinks) {
      for (const sub of link.subLinks) {
        if (sub.href === pathname) return sub.label;
      }
    }
  }
  const parts = pathname.split('/').filter(Boolean);
  return parts.length > 0
    ? parts[parts.length - 1]
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Dashboard';
}

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAppContext();
  const pageTitle = getPageTitle(pathname);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
          <Link
            href="/dashboard"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Home"
          >
            <Home className="h-5 w-5" />
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">{pageTitle}</span>
        </nav>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              {user ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={`https://placehold.co/40x40/3498DB/FFFFFF/png?text=${getInitials(user.name)}`}
                    alt={user.name}
                  />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              ) : (
                <Skeleton className="h-8 w-8 rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.name || 'My Account'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
