
'use client'


import { useScrollTop } from "@/hooks/use-scroll-top"
import { cn } from "@/lib/utils"
import { Logo } from "./Logo"
import { ModeToggle } from "@/components/mode-toggle"
import {DropdownMenuLoggedIn} from "./loggedInDropDown"
import authentication from "@/services/authentication"
import { useEffect, useState } from 'react'
    

export function Header() {

  const scrolled = useScrollTop()
  const [isTemp, setIsTemp] = useState(false)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const auth = new authentication()
        const cu = await auth.currentUser()
        if (mounted) setIsTemp(!!cu.isTemp)
      } catch(_) {}
    }
    run()
    return () => { mounted = false }
  }, [])

  return (
    <div className={cn(`z-50 bg-background dark:bg-[#1F1F1F] fixed top-0 flex items-center w-full p-3 border-b `,scrolled && 'border-b shadow-sm')}>
      <Logo/>
      <div className="md:ml-auto md:justify-end flex gap-x-2 justify-between items-center w-full">
        {!isTemp && (<DropdownMenuLoggedIn />)}
        <ModeToggle/>
      </div>
    </div>
  )
}