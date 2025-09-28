"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export function DropdownMenuLoggedIn() {
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="cursor-pointer">Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
      
      
            <DropdownMenuItem>
                <Link href="/bb-admin">
                    Admin
                </Link>
            </DropdownMenuItem>

            <DropdownMenuItem>
                <Link href="/bb-client">
                    Client
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
                <Link href="/account/manage">
                    Manage account
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
                <Link href="/account/signOut">
                    Sign out
                </Link>
            </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}