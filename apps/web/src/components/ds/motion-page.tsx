import * as React from "react"

import { motion } from "framer-motion"

import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/ui/components/icon"

import {
  MOTION_ROLES,
  motionTransition,
  resolveMotion,
  useFoundation,
  type MotionRole,
} from "@ambientui/foundation"

/**
 * The Motion page: documentation of the motion system — the four roles,
 * live timing readouts from the saved character and pace, and a replayable
 * demo per role. Configuration lives on the Foundation page (Motion
 * section); this page is the reference.
 */

function RoleDemo({ role }: { role: MotionRole }) {
  const { config } = useFoundation()
  const [on, setOn] = React.useState(false)
  const t = motionTransition(config, role)
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted relative h-6 w-40 overflow-hidden rounded-full">
        <motion.div
          className="bg-primary absolute top-1 left-1 size-4 rounded-full"
          initial={false}
          animate={{ x: on ? 136 : 0 }}
          transition={t}
        />
      </div>
      <Button
        size="xs"
        variant="outline"
        className="size-6 p-0"
        aria-label="Replay"
        onClick={() => setOn((v) => !v)}
      >
        <Icon name="play" size={12} />
      </Button>
    </div>
  )
}

export function MotionPage() {
  const { config } = useFoundation()
  const { character, timeScale } = resolveMotion(config)

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="text-xl font-semibold">Motion</h1>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        Motion is a Foundation dimension like color and spacing. Components
        consume <strong className="text-foreground">motion roles</strong> —
        one named job each — and the configured{" "}
        <strong className="text-foreground">character</strong> (currently{" "}
        {character.name}) and <strong className="text-foreground">pace</strong>{" "}
        decide what every role feels like, product-wide, on Save. Configured
        on the Foundation page (Motion section).
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            The four roles
          </div>
          <div className="border-border divide-border divide-y rounded-xl border">
            {MOTION_ROLES.map(({ role, label, description }) => (
              <div
                key={role}
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {description}
                  </div>
                  <div className="text-muted-foreground/80 mt-1 font-mono text-[10px]">
                    --motion-{role} ·{" "}
                    {Math.round(character.durations[role] * timeScale)}ms ·{" "}
                    {character.ease}
                  </div>
                </div>
                <RoleDemo role={role} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            How components consume it
          </div>
          <div className="text-muted-foreground flex flex-col gap-2 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">CSS (the default):</strong>{" "}
              every <code className="font-mono text-xs">transition-*</code>{" "}
              utility already rides the micro role — Tailwind&apos;s default
              transition duration and easing map onto{" "}
              <code className="font-mono text-xs">--motion-micro</code> /{" "}
              <code className="font-mono text-xs">--motion-ease</code>. A
              slower job names its role:{" "}
              <code className="font-mono text-xs">
                duration-(--motion-surface)
              </code>
              .
            </p>
            <p>
              <strong className="text-foreground">Framer Motion:</strong> pass{" "}
              <code className="font-mono text-xs">
                useMotionTransition(&quot;surface&quot;)
              </code>{" "}
              as a <code className="font-mono text-xs">transition</code>, or{" "}
              <code className="font-mono text-xs">useMotionSpring()</code> for
              gestural, interruptible moves.
            </p>
            <p>
              <strong className="text-foreground">The rule:</strong> never a
              literal duration, easing, or spring in component code — a
              stated &quot;200ms&quot; is a request for the nearest role. The
              orb&apos;s identity springs are the one sanctioned exception.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
