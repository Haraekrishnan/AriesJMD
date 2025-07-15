'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { NAV_LINKS } from '@/lib/constants';
import { Ship, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import React from 'react';

export function AppSidebar() {
  const pathname = usePathname();

  const isLinkActive = (href: string) => pathname === href;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary rounded-lg p-2 flex items-center justify-center">
            <Ship className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Aries Marine</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_LINKS.map((link, index) =>
            link.subLinks ? (
              <Collapsible key={index} className="w-full">
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <button className='flex items-center justify-between w-full group/menu-button peer/menu-button overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2'>
                          <div className='flex items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0'>
                            <link.icon />
                            <span className="truncate">{link.label}</span>
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </button>
                    </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {link.subLinks.map((subLink) => (
                      <SidebarMenuSubItem key={subLink.href}>
                        <SidebarMenuSubButton asChild isActive={isLinkActive(subLink.href)}>
                          <Link href={subLink.href}>
                            <subLink.icon />
                            <span>{subLink.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={link.label}
                  isActive={isLinkActive(link.href)}
                >
                  <Link href={link.href}>
                    <link.icon />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>{/* Can add user profile here later */}</SidebarFooter>
    </Sidebar>
  );
}
