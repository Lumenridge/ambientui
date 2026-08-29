"use client"

import * as React from "react"

import { motion } from "framer-motion"

import { useMotionSpring, useMotionTransition } from "@ambientui/foundation"

/**
 * REVEAL — content lands as the reader arrives: a one-time whileInView
 * entrance on the surface spring with a micro-tween fade (the standard
 * enter pair, DESIGN.md §5).
 *
 * Born on the playbook, promoted to a shared component when the overview
 * became the second page to want scroll-staged sections — exactly the
 * trigger its watchlist entry named. It stays an app-level composition
 * (not vocabulary) because it is a page-authoring device, not a product
 * control; if a third consumer appears outside this app, promotion to the
 * vocabulary is the next governance step.
 */
export function Reveal({
  children,
  className,
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const spring = useMotionSpring()
  const micro = useMotionTransition("micro")
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...spring, opacity: micro }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
