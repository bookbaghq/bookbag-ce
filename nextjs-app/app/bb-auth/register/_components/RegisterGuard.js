'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/apiConfig.json'

export default function RegisterGuard() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch(`${api.ApiConfig.main}/${api.ApiConfig.credentials.canRegister.url}`, {
          credentials: 'include',
          cache: 'no-store'
        })
        const data = await res.json().catch(() => null)
        if (!cancelled && data && data.success && data.sign_up_enabled === false) {
          router.replace('/bb-auth/login')
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


