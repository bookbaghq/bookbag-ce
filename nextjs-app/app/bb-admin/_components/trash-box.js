'use client'

import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function TrashBox() {
  const router = useRouter()

  // Placeholder component for the trash functionality
  return (
    <div className="text-sm p-2">
      <div className="text-center text-muted-foreground/80 pb-2">
        <p>No documents in trash</p>
      </div>
    </div>
  )
}
