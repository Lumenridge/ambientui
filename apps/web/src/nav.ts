import {
  CubeIcon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"

// The app's navigable pages. The assistant's palette builds its
// "Jump to" items from this list, so it stays decoupled from any
// particular product interface.

export type SectionId = "canvas" | "ds"

export type Section = {
  id: SectionId
  label: string
  description: string
  icon: typeof CubeIcon
}

export const sections: Section[] = [
  {
    id: "canvas",
    label: "Canvas",
    description: "An empty page for the ambient layer to live on.",
    icon: WorkflowSquare01Icon,
  },
  {
    id: "ds",
    label: "Design system",
    description:
      "Foundation config and every component installed from the shadcn preset.",
    icon: CubeIcon,
  },
]
