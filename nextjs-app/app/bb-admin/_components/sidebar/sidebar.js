'use client'

import React, { useEffect, useRef, useState } from "react";
import { TeamSwitcher } from "./team-switcher";
import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { NavUser } from "./nav-user";
import * as LucideIcons from "lucide-react";
import api from '@/apiConfig.json';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Icon mapping helper
const getIconComponent = (iconName) => {
  if (!iconName) return null;
  return LucideIcons[iconName] || null;
};

export function SidebarNav (props) {
  const [storageUsage, setStorageUsage] = useState({ mb: 0, quota: 1024, percentUsed: 0 });
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch menu items and storage usage on mount
  useEffect(() => {
    fetchMenuItems();
    fetchStorageUsage();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const base = api.ApiConfig.main;
      const response = await fetch(`${base}/api/layout/sidebar`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        // Transform backend data to frontend format
        const transformedMenu = data.menu.map(menuItem => {
          const item = {
            id: menuItem.id,  // Include unique ID for React keys
            title: menuItem.label,
            url: menuItem.url,
            icon: getIconComponent(menuItem.icon),
          };

          // Check if this menu item has submenus
          const submenus = data.submenu[menuItem.id];
          if (submenus && submenus.length > 0) {
            // Has submenus - add items array
            item.items = submenus.map((sub, idx) => ({
              id: `${menuItem.id}-${idx}`,  // Generate unique ID for submenu items
              title: sub.label,
              url: sub.url
            }));
          }

          return item;
        });

        setMenuItems(transformedMenu);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageUsage = async () => {
    try {
      const base = api.ApiConfig.main;
      const response = await fetch(`${base}/bb-media/api/media/storage`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setStorageUsage({
          mb: data.mb || 0,
          quota: data.quota || 1024,
          percentUsed: data.percentUsed || 0
        });
      }
    } catch (error) {
      console.error('Error fetching storage usage:', error);
    }
  };



  if (loading) {
    return (
      <Sidebar collapsible="icon" {...props} className="pt-16">
        <SidebarContent>
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Loading menu...</p>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <>
      <Sidebar collapsible="icon" {...props} className="pt-16">
        <SidebarContent>
          <NavMain items={menuItems} />
        </SidebarContent>

        {/* Storage Footer */}
        <SidebarFooter className="p-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Storage: {storageUsage.mb.toFixed(2)} / {storageUsage.quota} MB ({storageUsage.percentUsed.toFixed(1)}%)
          </p>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
