'use client'

import React, { useEffect, useRef, useState } from "react";
import { TeamSwitcher } from "./team-switcher";
import { NavMain } from "./nav-main";
import { NavProjects } from "./nav-projects";
import { NavUser } from "./nav-user";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  LayoutDashboard,
  Users,
  MessageSquare,
  HardDrive,
  FolderOpen,
  Activity
} from "lucide-react"


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"



export function SidebarNav (props) {
  const [storageUsage, setStorageUsage] = useState({ mb: 0, quota: 1024, percentUsed: 0 });

  // Fetch storage usage on mount
  useEffect(() => {
    fetchStorageUsage();
  }, []);

  const fetchStorageUsage = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;
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



  // This is sample data.
const data = {

  navMain: [
    {
      title: "Dashboard",
      url: "/bb-admin",
      icon: LayoutDashboard,
    },
    {
      title: "Users",
      url: "/",
      icon: SquareTerminal,
      items: [
        {
          title: "Dashboard",
          url: "/bb-admin/users",
        },
        {
          title: "All Users",
          url: "/bb-admin/users/all",
        },
        {
          title: "Add New",
          url: "/bb-admin/users/add-new",
        },
        {
          title: "Profile",
          url: "/bb-admin/users/profile",
        },
        {
          title: "Settings",
          url: "/bb-admin/users/settings",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Library",
          url: "/bb-admin/models/library",
        },
        {
          title: "My Models",
          url: "/bb-admin/models/my-models",
        },
        {
          title: "Settings",
          url: "/bb-admin/models/settings",
        },
      ],
    },
    {
      title: "Workspaces",
      url: "#",
      icon: LayoutDashboard,
      items: [
        { title: "All", url: "/bb-admin/workspaces" },
      ],
    },
    {
      title: "Chats",
      url: "#",
      icon: MessageSquare,
      items: [
        {
          title: "Search",
          url: "/bb-admin/chats/search",
        }
        ,
        {
          title: "Create",
          url: "/bb-admin/chats/create",
        }
      ],
    },
    {
      title: "Media",
      url: "#",
      icon: FolderOpen,
      items: [
        { title: "All Media", url: "/bb-admin/media" },
        { title: "RAG Files", url: "/bb-admin/media/rag-files" },
        { title: "Settings", url: "/bb-admin/media/settings" },
      ],
    },
    {
      title: "RAG",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Settings", url: "/bb-admin/rag/settings" },
      ],
    },
    {
      title: "Tokens",
      url: "#",
      icon: Activity,
      items: [
        { title: "Analytics", url: "/bb-admin/tokens/analytics" },
      ],
    },
    {
      title: "Mail",
      url: "#",
      icon: Settings2,
      items: [
        { title: "Settings", url: "/bb-admin/mail/settings" },
        { title: "Email Logs", url: "/bb-admin/mail/logs" }
      ],
    },


  ],
  projects: [

  ],
}

return (
    <>

      <Sidebar  collapsible="icon" {...props} className="pt-16">

        <SidebarContent>
          <NavMain items={data.navMain} />
        </SidebarContent>

        {/* Storage Footer */}
        <SidebarFooter className="p-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Storage: {storageUsage.mb.toFixed(2)} / {storageUsage.quota} MB ({storageUsage.percentUsed.toFixed(1)}%)
          </p>
        </SidebarFooter>

    </Sidebar>



    </>
)
}
