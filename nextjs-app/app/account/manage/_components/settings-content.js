'use client'

import { useState, useEffect } from 'react'
import { ProfileForm } from './profile-form'
// Removed extra forms; keep only Profile

export function SettingsContent({ activeItem }) {
  const [activeForm, setActiveForm] = useState('profile')

  useEffect(() => {
    if (activeItem) {
      setActiveForm(activeItem)
    }
  }, [activeItem])

  return (
    <div className="w-full">
      {activeForm === 'profile' && <ProfileForm />}
    </div>
  )
}
