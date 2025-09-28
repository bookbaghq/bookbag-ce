"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef(({ className, defaultValue, value, onValueChange, ...props }, ref) => {
  const [selectedValue, setSelectedValue] = React.useState(defaultValue || value || "")
  
  React.useEffect(() => {
    if (value !== undefined && value !== selectedValue) {
      setSelectedValue(value)
    }
  }, [value, selectedValue])

  const handleChange = (newValue) => {
    setSelectedValue(newValue)
    if (onValueChange) {
      onValueChange(newValue)
    }
  }

  return (
    <div
      ref={ref}
      className={cn("grid gap-2", className)}
      {...props}
      data-value={selectedValue}
    >
      {React.Children.map(props.children, child => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child, {
          selectedValue,
          onSelect: handleChange
        })
      })}
    </div>
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef(({ className, id, value, selectedValue, onSelect, children, ...props }, ref) => {
  const isSelected = selectedValue === value
  
  return (
    <div className="flex items-center">
      <button
        type="button"
        ref={ref}
        id={id}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isSelected && "border-2",
          className
        )}
        aria-checked={isSelected}
        onClick={() => onSelect && onSelect(value)}
        {...props}
      >
        {isSelected && (
          <div className="h-2 w-2 rounded-full bg-primary m-auto" />
        )}
      </button>
      {children}
    </div>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
