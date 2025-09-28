'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function ModelSidebar({ className, onFamilyChange, value = 'all' }) {
  const [activeFamily, setActiveFamily] = useState(value || 'all')

  useEffect(() => {
    setActiveFamily(value || 'all')
  }, [value])

  const families = [
    {
      id: 'all',
      title: 'All Models'
    },
    {
      id: 'deepseek',
      title: 'Deepseek'
    },
    {
      id: 'qwen',
      title: 'Qwen'
    },
    {
      id: 'llama',
      title: 'Llama'
    },
    {
      id: 'gemma',
      title: 'Gemma'
    }
  ]

  const handleFamilyClick = (familyId) => {
    setActiveFamily(familyId)
    if (onFamilyChange) {
      onFamilyChange(familyId)
    }
  }

  return (
    <nav
      className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:min-w-[200px]", className)}
    >
      {families.map((family) => (
        <button
          key={family.id}
          onClick={() => handleFamilyClick(family.id)}
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            activeFamily === family.id
              ? "bg-secondary text-secondary-foreground"
              : "hover:bg-secondary/50"
          )}
        >
          {family.title}
        </button>
      ))}
    </nav>
  )
}
