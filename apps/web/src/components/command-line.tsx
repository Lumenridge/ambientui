import * as React from "react"

import { toast } from "sonner"

import { Button } from "@ambientui/ui/components/button"
import { cn } from "@ambientui/ui/lib/utils"

import { Icon } from "@/components/icon"

/**
 * A COMMAND YOU COPY — not a command the assistant ran.
 *
 * That distinction is why this is not `TerminalBlock`: that component is
 * ambient evidence of the assistant doing something, with streaming output
 * and an exit code. This is an instruction addressed to the reader.
 *
 * COMPOSED, NOT PROMOTED (owner's call on the pattern watchlist, 2026-08-23).
 * It stays app-level rather than entering the vocabulary — but it is written
 * ONCE, here, because the install section and the gallery both need it and a
 * treatment re-decided per call site is exactly the drift a component would
 * have prevented. If a surface outside this app ever needs it, that is the
 * moment to revisit promotion properly.
 */
export function CommandLine({
  command,
  size = "default",
  className,
}: {
  command: string
  /** `lead` is the one-command hero treatment; default is inline. */
  size?: "default" | "lead"
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      toast.success("Copied to your clipboard")
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // the clipboard API is permission-gated and otherwise fails silently
      toast.error("Couldn't copy — select the command and copy it by hand")
    }
  }

  return (
    <div
      className={cn(
        "border-border bg-card flex items-center gap-3 rounded-xl border",
        size === "lead" ? "px-4 py-3" : "px-3 py-2",
        className
      )}
    >
      {/* decoration, so it is deliberately not part of the copied string */}
      <span aria-hidden className="text-muted-foreground shrink-0 font-mono">
        $
      </span>
      <code
        className={cn(
          "min-w-0 flex-1 font-mono",
          size === "lead"
            ? "overflow-x-auto text-sm whitespace-pre"
            : // a half-shown command reads as a broken one, even when the
              // copy button holds all of it
              "text-xs leading-relaxed break-all"
        )}
      >
        {command}
      </code>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={copied ? "Copied" : `Copy: ${command}`}
        onClick={copy}
        className="shrink-0 rounded-lg"
      >
        <Icon name={copied ? "check" : "copy"} size={14} />
      </Button>
    </div>
  )
}
