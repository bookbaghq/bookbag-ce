'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/apiConfig.json'

export default function LoginGuard() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch(`${api.ApiConfig.main}/${api.ApiConfig.credentials.canLogin.url}`, {
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


