'use client'

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export function Item({ 
  id,
  documentIcon,
  active,
  expanded,
  isSearch,
  level = 0,
  onExpand,
  onClick,
  icon: Icon,
  label,
  className
}) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      className={cn(
        "group min-h-[27px] text-sm py-1 pr-3 w-full hover:bg-primary/5 flex items-center text-muted-foreground font-medium rounded-sm",
        active && "bg-primary/5 text-primary",
        className
      )}
    >
      {!!documentIcon && (
        <div className="shrink-0 mr-2 text-[18px]">
          {documentIcon}
        </div>
      )}
      {Icon && !documentIcon && (
        <Icon
          className={cn(
            "shrink-0 h-[18px] w-[18px] mr-2 text-muted-foreground",
            active && "text-primary",
          )}
        />
      )}
      <span className="truncate">
        {label}
      </span>
    </div>
  )
}
