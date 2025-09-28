"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ 
  className, 
  min = 0,
  max = 100,
  step = 1,
  value = [0],
  onValueChange,
  ...props 
}, ref) => {
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value)
    if (onValueChange) {
      onValueChange([newValue])
    }
  }
  
  return (
    <div 
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer"
        style={{
          // Custom styling to make it look better
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, 
            var(--primary) 0%, 
            var(--primary) ${((value[0] - min) / (max - min)) * 100}%, 
            var(--secondary) ${((value[0] - min) / (max - min)) * 100}%, 
            var(--secondary) 100%)`
        }}
      />
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }
