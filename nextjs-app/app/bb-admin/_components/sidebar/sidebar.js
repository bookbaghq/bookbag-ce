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
} from "lucide-react"


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

	

export function SidebarNav (props) {



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

    </Sidebar>



    </>
)
}
