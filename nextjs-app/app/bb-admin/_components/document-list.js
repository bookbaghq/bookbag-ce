'use client'

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function DocumentList() {
  const router = useRouter()

  // Placeholder component - would normally fetch and display documents
  return (
    <div className="px-2 mb-2">
      <p className="hidden last:block text-xs text-center text-muted-foreground pb-2">
        No documents found
      </p>
    </div>
  )
}
