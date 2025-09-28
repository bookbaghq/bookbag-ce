'use client'

import { useRouter } from "next/navigation"
import { MenuIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navbar({ 
  isCollapsed, 
  onResetWidth 
}) {
  const router = useRouter()

  return (
    <nav className="bg-transparent px-3 py-2 w-full flex items-center gap-x-4">
      {isCollapsed && (
        <MenuIcon 
          role="button"
          onClick={onResetWidth}
          className="h-6 w-6 text-muted-foreground"
        />
      )}
      <div className="flex items-center justify-between w-full">
        <div>
          <h1 className="font-semibold text-xl text-foreground">
            Admin Panel
          </h1>
        </div>
        <div className="flex items-center gap-x-2">
          {/* Add any additional navbar elements here */}
        </div>
      </div>
    </nav>
  )
}
