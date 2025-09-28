

import { LoginForm } from "./_components/LoginForm";
import api from '@/apiConfig.json'
import { redirect } from 'next/navigation'
import React from 'react'
import LoginGuard from './_components/LoginGuard'


export default async function LoginPage() {
  // SSR fetch settings to decide visibility
  try {
    const res = await fetch(`${api.ApiConfig.main}/${api.ApiConfig.credentials.canLogin.url}`, { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (data && data.success && data.sign_in_enabled === false) {
      redirect('/bb-client');
    }
  } catch (_) {}

  return (

    <div>
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
            <LoginGuard />
            <LoginForm />

            </div>
        </div>
  </div>
  );
}