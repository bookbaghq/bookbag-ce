'use client';

import { SidebarNav } from "./_components/sidebar/sidebar";
import { Header } from "../../components/navigation/header";
import { Spinner } from "@/components/spinner";
import authentication from "../../services/authentication";
import { UserProvider } from "./_components/user-provider";
import { useEffect, useState } from 'react';
import { redirect } from "next/navigation";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AdminLayout({ children }) {
  
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

  useEffect(() => {
    async function loadData() {
      // Load authentication data
      const auth = new authentication();
      const currentUser = await auth.currentUser();
      // Update auth state
      setCurrentUserState({
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


  // Show a loading spinner if user data is still loading
  if (currentUserState.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
if (
  (currentUserState.isAuthenticated === true && currentUserState.isSubscriber === false) ||
  (currentUserState.isAuthenticated === false && currentUserState.isSubscriber === true) || (currentUserState.isAuthenticated === false && currentUserState.isSubscriber === false)
) {
      redirect('/bb-auth/login');
  }else{
    return (
      <UserProvider initialUserState={currentUserState}>
        <div>
          <Header />
          <div className="h-full flex dark:bg-[#1F1F1F]">
            <SidebarProvider>
              <SidebarNav />
              <SidebarInset className="w-full">
                <main className="flex-1 h-full overflow-y-auto relative pt-16 group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full">
                  <div className="w-full">
                    {children}
                  </div>
                </main>
              </SidebarInset>
            </SidebarProvider>
          </div>
        </div>
      </UserProvider>
    );
  }

}
