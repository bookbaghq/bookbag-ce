'use client'
import { Spinner } from "@/components/spinner"
import { redirect } from "next/navigation";
import authentication from "../../../services/authentication";
import { useEffect, useState } from 'react'

export default function SignOutPage() {
    // todo we will call the signout api then we will redirect the user to the login page.

  
    useEffect(() => {
      async function loadData() {
        var auth = new authentication();
        await auth.logout();
        redirect('/bb-auth/login');
       
      }
      loadData();
    }, []);
  

  return (

   <div className="h-full flex items-center justify-center">
                     <Spinner size="lg" />
    </div>
  );
}