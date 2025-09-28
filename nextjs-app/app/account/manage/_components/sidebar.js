
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SettingsContent } from './settings-content'

export function Sidebar({ className }) {
  const [activeItem, setActiveItem] = useState('profile')

  const items = [
    {
      id: 'profile',
      title: 'Profile'
    }
  ]

  return (
    <div className="flex flex-col lg:flex-row w-full gap-8">
      <nav
        className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:w-1/5", className)}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              activeItem === item.id
                ? "bg-secondary text-secondary-foreground"
                : "hover:bg-secondary/50"
            )}
          >
            {item.title}
          </button>
        ))}
      </nav>
      <div className="lg:w-4/5">
        <SettingsContent activeItem={activeItem} />
      </div>
    </div>
  )
}
