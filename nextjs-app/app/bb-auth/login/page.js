

import { LoginForm } from "./_components/LoginForm";
import api from '@/apiConfig.json'
import { redirect } from 'next/navigation'
import React from 'react'
import LoginGuard from './_components/LoginGuard'


export default async function LoginPage() {
  // SSR fetch settings to decide visibility
  try {
    // Check if client-side access is disabled
    const adminSettingsRes = await fetch(`${api.ApiConfig.main}/api/admin/settings`, { cache: 'no-store' });
    const adminSettings = await adminSettingsRes.json().catch(() => null);

    const res = await fetch(`${api.ApiConfig.main}/${api.ApiConfig.credentials.canLogin.url}`, { cache: 'no-store' });
    const data = await res.json().catch(() => null);

    // If both client-side is disabled AND login is disabled, redirect to access denied
    if (adminSettings && adminSettings.success && adminSettings.settings.disable_client_side === true) {
      if (data && data.success && data.sign_in_enabled === false) {
        redirect('/bb-auth/access-denied');
      }
    }

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