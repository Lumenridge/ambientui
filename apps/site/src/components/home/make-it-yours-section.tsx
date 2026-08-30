import { Button } from "@ambientui/ui/components/button"
import { Icon } from "@ambientui/ui/components/icon"

/**
 * THE TWO MARKS, AND WHY THEY ARE HAND-DRAWN SVG.
 *
 * DESIGN.md §6 says icons come from `<Icon name>` and nothing else. That
 * rule is about the ICON VOCABULARY — semantic names the Foundation's
 * configured library draws — and a third party's logo is not a semantic
 * name. Tailwind's wave and shadcn's slash are fixed artwork owned by
 * somebody else; mapping them into all five icon libraries would be
 * claiming they are ours to redraw. They are the only two exceptions, and
 * they live here rather than in the icon set for exactly that reason.
 *
 * THEY ARE MONOCHROME ON PURPOSE. Tailwind's mark is officially cyan, but
 * a hex in component code is the thing this repo exists to prevent, and a
 * logo strip in one muted weight reads as provenance rather than as two
 * badges competing with the heading above them.
 */
function TailwindMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 33" fill="currentColor" aria-hidden className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.514-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.514-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z"
      />
    </svg>
  )
}

function ShadcnMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      stroke="currentColor"
      strokeWidth={26}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <line x1="208" y1="128" x2="128" y2="208" />
      <line x1="192" y1="40" x2="40" y2="192" />
    </svg>
  )
}

/**
 * THE ONE PART OF THIS PAGE YOU CAN GO AND DO.
 *
 * It used to be a closing note pinned under the design-architecture
 * argument, in smaller type, behind a rule — the shape a page uses for a
 * footnote. It is not a footnote. Everything around it is an argument about
 * configuration; this is the live configuration, and a visitor who reads
 * one sentence of the page should be able to reach it.
 *
 * SO IT STANDS ON ITS OWN, AND IT STANDS FIRST. The invitation comes before
 * the explanation, because the explanation is more convincing to someone who
 * has already watched the site re-theme itself. The composition is the same
 * one the design-architecture opening uses — eyebrow, a title at the size of
 * the thing it names, one centred line, one button — so the two read as
 * siblings rather than as a section and its appendix.
 *
 * THE COPY GOT SHORTER IN THE MOVE. A paragraph that was fine at body size
 * becomes a wall at display size; what survives is the claim (it is live)
 * and the consequence (everything follows).
 */
export function MakeItYoursSection({
  onFoundation,
}: {
  /** Take them to the Foundation itself, which is /ds. */
  onFoundation: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl px-2 py-16 text-center sm:py-24">
      <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
        Make it yours
      </p>
      <h2 className="mt-8 text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
        Change one value
      </h2>
      <p className="text-muted-foreground mx-auto mt-10 max-w-xl text-lg leading-relaxed text-balance sm:text-xl">
        The Foundation on this site is live, not a picture of one. Pick a
        different accent or a tighter spacing step and every component on
        every page redraws while you watch, the assistant included. Save, and
        it is your theme.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-10"
        onClick={onFoundation}
      >
        Open the Foundation
        <Icon name="chevron-right" size={15} />
      </Button>

      {/* THE PROVENANCE ROW. "Configuration space" sounds like a private
          format until you see what it is made of: the menu is Tailwind's
          own scales, and the components are shadcn's. Nothing here asks a
          reader to adopt a new vocabulary — that is the reassurance, and it
          belongs under the invitation rather than in the argument, because
          it answers the question the button raises. */}
      <div className="text-muted-foreground mt-14 flex flex-col items-center gap-4">
        <p className="text-sm">
          Built on the foundations of the stack you already use
        </p>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <TailwindMark className="h-4 w-auto" />
            <span className="text-sm font-medium">Tailwind CSS</span>
          </span>
          <span className="bg-border h-4 w-px" />
          <span className="flex items-center gap-2">
            <ShadcnMark className="size-4" />
            <span className="text-sm font-medium">shadcn/ui</span>
          </span>
        </div>
      </div>
    </div>
  )
}
