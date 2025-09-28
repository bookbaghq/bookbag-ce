"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const SheetContext = React.createContext({
  open: false,
  setOpen: () => {},
  side: "right"
})

// Sheet root component
const Sheet = ({ children, defaultOpen = false, open: controlledOpen, onOpenChange }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = typeof controlledOpen === 'boolean'
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled && typeof onOpenChange === 'function' ? onOpenChange : setUncontrolledOpen

  return (
    <SheetContext.Provider value={{ open, setOpen, side: "right" }}>
      {children}
    </SheetContext.Provider>
  )
}

// Trigger button
const SheetTrigger = ({ children, asChild }) => {
  const { setOpen } = React.useContext(SheetContext)
  
  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e) => {
        e.preventDefault()
        setOpen(true)
        if (children.props.onClick) {
          children.props.onClick(e)
        }
      }
    })
  }
  
  return (
    <button onClick={() => setOpen(true)}>
      {children}
    </button>
  )
}

// Close button
const SheetClose = ({ children, asChild }) => {
  const { setOpen } = React.useContext(SheetContext)

  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e) => {
        e.preventDefault()
        setOpen(false)
        if (children.props.onClick) {
          children.props.onClick(e)
        }
      }
    })
  }

  return (
    <button onClick={() => setOpen(false)}>
      {children}
    </button>
  )
}

// Overlay component
const SheetOverlay = ({ className, ...props }) => {
  const { open, setOpen } = React.useContext(SheetContext)
  
  if (!open) return null
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-black/80 transition-opacity",
        open ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )} 
      onClick={() => setOpen(false)}
      {...props}
    />
  )
}

// Content component
const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => {
  const { open, setOpen } = React.useContext(SheetContext)
  
  if (!open) return null
  
  const sideStyles = {
    top: "inset-x-0 top-0 border-b",
    bottom: "inset-x-0 bottom-0 border-t",
    left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
    right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
  }
  
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <SheetOverlay />
      <div
        ref={ref}
        className={cn(
          "fixed z-50 gap-4 bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out pointer-events-auto",
          sideStyles[side],
          open ? "translate-x-0" : side === "right" ? "translate-x-full" : "translate-x-[-100%]",
          className
        )}
        {...props}
      >
        {children}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )
})
SheetContent.displayName = "SheetContent"

// Header component
const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

// Footer component
const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

// Title component
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

// Description component
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
}
