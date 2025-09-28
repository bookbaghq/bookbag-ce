'use client';

import { Header as Navbar } from "@/components/navigation/header";
import { Spinner } from "@/components/spinner";
import authentication from "../../services/authentication";
import { useEffect, useState } from 'react';
import { redirect } from "next/navigation";

export default function AuthLayout({ children }) {

    const [authState, setAuthState] = useState({
      isLoading: true,
      isAuthenticated: false,
      isSubscriber: false,
      isAdmin: false,
    });
  
    useEffect(() => {
      async function loadData() {
        
       const auth = new authentication();
       const currentUser = await auth.currentUser();
  
        setAuthState({
          isLoading: currentUser.isLoading,
          isAuthenticated: currentUser.isAuthenticated,
          isSubscriber: currentUser.isSubscriber,
          isAdmin: currentUser.isAdmin,
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
  
    // Optionally redirect if not authenticated/admin
    if (authState.isAuthenticated) {
    return ( 
        <div className="h-full flex dark:bg-[#1F1F1F]">
          <Navbar />
            <main className="flex-1 h-full overflow-y-auto top-16 relative">
              {children}
            </main>
          </div>
        );
  
    }
    else{
         redirect('/bb-auth/login');
        return null;
    }


}