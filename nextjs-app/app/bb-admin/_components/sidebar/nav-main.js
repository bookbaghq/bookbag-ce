"use client";

import React, { useEffect, useState } from 'react'
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({ items }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(() => {
    try {
      const raw = localStorage.getItem('bb-admin:sidebar:expanded');
      const parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_) {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem('bb-admin:sidebar:expanded', JSON.stringify(expanded)); } catch (_) {}
  }, [expanded]);
  
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // If item has no sub-items, render as a standalone menu item
          if (!item.items || item.items.length === 0) {
            const isActive = pathname === item.url;
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={isActive ? "bg-accent text-accent-foreground" : ""}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
          
          // If item has sub-items, render as a collapsible dropdown
          const hasActiveChild = item.items.some(subItem => 
            pathname === subItem.url || pathname.startsWith(subItem.url + '/')
          );
          
          return (
            <Collapsible
              key={item.title}
              asChild
              open={expanded[item.title] != null ? !!expanded[item.title] : (item.isActive || hasActiveChild)}
              onOpenChange={(open) => {
                setExpanded(prev => ({ ...prev, [item.title]: open }));
              }}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => {
                      // Use strict exact path matching for sub-items
                      const isActive = pathname === subItem.url;
                      
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            asChild 
                            className={isActive ? "bg-accent text-accent-foreground" : ""}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
