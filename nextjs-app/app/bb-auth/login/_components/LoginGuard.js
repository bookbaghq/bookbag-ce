'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/apiConfig.json'
import getBackendBaseUrl from '@/lib/backendUrl'

export default function LoginGuard() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const base = getBackendBaseUrl()

        // Check if client-side is disabled
        const adminSettingsRes = await fetch(`${base}/api/admin/settings`, {
          credentials: 'include',
          cache: 'no-store'
        })
        const adminSettings = await adminSettingsRes.json().catch(() => null)
        const isClientDisabled = adminSettings?.success && adminSettings?.settings?.disable_client_side === true

        // Check if user is logged in
        const res = await fetch(`${base}/${api.ApiConfig.credentials.canLogin.url}`, {
          credentials: 'include',
          cache: 'no-store'
        })
        const data = await res.json().catch(() => null)

        if (!cancelled && data && data.success && data.sign_in_enabled === false) {
          // User is logged in

          if (isClientDisabled) {
            // Client-side is disabled - check if user is admin
            const userRes = await fetch(`${base}/bb-user/api/auth/currentuser`, {
              credentials: 'include',
              cache: 'no-store'
            })
            const userData = await userRes.json().catch(() => null)

            if (userData?.isAdmin === true) {
              // User is admin - redirect to admin panel
              router.replace('/bb-admin')
            } else {
              // User is not admin - logout and redirect to access denied
              await fetch(`${base}/bb-user/api/auth/logout`, {
                credentials: 'include',
                cache: 'no-store'
              })
              router.replace('/bb-auth/access-denied')
            }
          } else {
            // Client-side is enabled - redirect to client
            router.replace('/bb-client')
          }
        }
      } catch (_) {
        // ignore
      }
    }
    check()
    return () => { cancelled = true }
  }, [router])

  return null
}


