"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Sonner, dressed in the system: the toast surface is the popover role,
 * hairlines are --border, so the role map retints notifications like
 * everything else. Theme comes from the app's theme provider via the
 * `theme` prop.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
