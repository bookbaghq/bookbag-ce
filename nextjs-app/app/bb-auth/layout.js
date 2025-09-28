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
      id: "",
      role: "",
    });

    const [currentUserState, setCurrentUserState] = useState({
      isLoading: true,
      user: null
    });
  
    useEffect(() => {
      async function loadData() {
        
       const auth = new authentication();
       const currentUser = await auth.currentUser();
  
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
  
    // Optionally redirect if not authenticated/admin
    if (authState.isAuthenticated) {
       redirect('/bb-client');
    }
    else{
      return ( 
          <div className="h-full dark:bg-[#1F1F1F]">
          <Navbar />
            <main className="h-full">
              {children}
            </main>
          </div>
        );
    }


}