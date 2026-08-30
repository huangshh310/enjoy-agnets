import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-2lg border border-border-button-default bg-background-primary-default px-3 py-1 text-body-medium text-text-primary shadow-xs outline-none placeholder:text-text-placeholder",
        "focus-visible:border-border-focus-ring focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-border-error-default",
        className
      )}
      {...props}
    />
  )
}

export { Input }
