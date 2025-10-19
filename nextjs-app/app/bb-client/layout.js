'use client';

import { SidebarNav } from "./(sidebar)/sidebar";
import { Header } from "../../components/navigation/header";
import { Spinner } from "@/components/spinner";
import authentication from "../../services/authentication";
import { useEffect, useState } from 'react';
import { redirect } from "next/navigation";
import api from '@/apiConfig.json'
import getBackendBaseUrl from '@/lib/backendUrl'

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { SidebarWidthProvider, useSidebarWidth } from './_components/SidebarWidthContext';

function ClientLayoutInner({ children }) {
  const { sidebarWidth, isCollapsed } = useSidebarWidth();

  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    isSubscriber: false,
    isAdmin: false,
    id: "",
    role: "",
  });

    const [currentUserState, setCurrentUserState] = useState({
      isLoading: true,
      user: null
    });

  // Set CSS variable on document root for global access
  useEffect(() => {
    const actualWidth = isCollapsed ? 64 : sidebarWidth;
    document.documentElement.style.setProperty('--sidebar-width', `${actualWidth}px`);
  }, [sidebarWidth, isCollapsed]);

  useEffect(() => {
    async function loadData() {
      // Check settings to decide sign-in requirement
      let signInEnabled = true;
      try {
        const base = getBackendBaseUrl()
        const res = await fetch(`${base}/${api.ApiConfig.settings.get.url}`, { credentials: 'include' });
        const data = await res.json();
        signInEnabled = data?.settings?.sign_in_enabled !== false;
      } catch(_) {}

      const auth = new authentication();
      const currentUser = signInEnabled ? await auth.currentUser() : { isAuthenticated: true, isSubscriber: true, isAdmin: false, id: '__temp__', role: 'Subscriber' };
  

      setAuthState({
        isLoading: false,
        isAuthenticated: currentUser.isAuthenticated,
        isSubscriber: currentUser.isSubscriber,
        isAdmin: currentUser.isAdmin,
        id: currentUser.id,
        role: currentUser.role,
      });
    }
    loadData();
  }, []);


 if (authState.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  

  // Redirect when sign-in required and not authenticated
      if (!authState.isAuthenticated) {
            redirect('/bb-auth/login');
      }
      else{
        const actualWidth = isCollapsed ? 64 : sidebarWidth;
          return (
              <div>
                  <div className="h-full flex dark:bg-[#1F1F1F]" style={{ '--sidebar-width': `${actualWidth}px` }}>
                    <SidebarProvider>
                      <Header />
                      <SidebarNav />
                      <SidebarInset style={{ marginLeft: `${actualWidth}px` }}>
                        <main className="fixed h-screen overflow-hidden relative pt-16 group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full">
                          {children}
                        </main>
                      </SidebarInset>
                    </SidebarProvider>
                  </div>
              </div>
            );
        }

}

export default function ClientLayout({ children }) {
  return (
    <SidebarWidthProvider>
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </SidebarWidthProvider>
  );
}
