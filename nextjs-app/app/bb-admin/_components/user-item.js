'use client'

import { useRouter } from "next/navigation"
import { ChevronsLeft, ChevronsRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export function UserItem() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between mb-4 p-2">
      <div className="flex items-center gap-x-2">
        <div className="w-8 h-8 bg-primary/10 text-primary rounded-md flex items-center justify-center">
          <span className="font-semibold text-sm">UA</span>
        </div>
        <span className="font-medium text-sm">
          User Account
        </span>
      </div>
    </div>
  )
}
