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
        const res = await fetch(`${base}/${api.ApiConfig.credentials.canLogin.url}`, {
          credentials: 'include',
          cache: 'no-store'
        })
        const data = await res.json().catch(() => null)
        if (!cancelled && data && data.success && data.sign_in_enabled === false) {
          router.replace('/bb-client')
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


