import { DsRail } from "@/components/ds/ds-rail"

/** The reference's shell: the rail beside whatever page is open. */
export default function DsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh">
      <DsRail />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
