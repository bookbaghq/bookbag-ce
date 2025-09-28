

import { RegisterForm } from "./_components/RegisterForm";
import api from '@/apiConfig.json'
import { redirect } from 'next/navigation'
import RegisterGuard from './_components/RegisterGuard'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

export default async function RegisterPage() {
  try {
    // Use dedicated endpoint so backend can change logic without frontend changes
    const res = await fetch(`${api.ApiConfig.main}/${api.ApiConfig.credentials.canRegister.url}`, { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (data && data.success && data.sign_up_enabled === false) {
      redirect('/bb-auth/login');
    }
  } catch (_) {}

  return (

    <div className="pt-[100px] bg-muted">
        {/* Client-side guard to ensure redirect if SSR was bypassed */}
        <RegisterGuard />
        <div className="flex min-h-svh flex-col items-center justify-center  p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
            <RegisterForm  />
            </div>
        </div>
  </div>
  );
}