/**
 * THE CHAT STACKS THE LAYER RUNS ON — declared once, here.
 *
 * A stack is an adapter file (`packages/ambient/src/stack-<name>.ts`) and
 * one entry below. Everything that has to know the stacks reads this file:
 * the survey (which stack a product runs, and where), the plan (which door
 * to open), the registry build (what each door says) and verify-install
 * (that each door lands and compiles). Adding a stack touches nothing else.
 */

/**
 * The adapter doors, by name. `exports` is what the door's file must
 * export; verify-install checks it landed.
 */
export const STACK_DOORS = {
  "stack-ai-sdk": {
    title: "Vercel AI SDK adapter",
    description:
      "Puts the ambient layer on a product that runs the Vercel AI SDK: its chat route, or its Chat instance, answers the layer.",
    exports: "aiSdkRoute",
    docs: 'Needs the ambient layer. Give the provider an API built from the adapter:\n\n  const api = createAmbientApi(aiSdkRoute({ api: "/api/chat" }))\n\nor, to share the product\'s own Chat (its tools, approvals and messages): createAmbientApi(aiSdkChat(() => chat)). See docs/chat-stacks.md.',
  },
  "stack-assistant-ui": {
    title: "assistant-ui adapter",
    description:
      "Puts the ambient layer on a product that runs an assistant-ui runtime: the layer asks through the runtime's thread and follows it.",
    exports: "assistantUIThread",
    docs: "Needs the ambient layer. Give the provider an API built from the runtime:\n\n  const api = createAmbientApi(assistantUIThread(() => runtime.thread))\n\nSee docs/chat-stacks.md.",
  },
  "stack-ag-ui": {
    title: "AG-UI adapter (CopilotKit, LangGraph, Mastra)",
    description:
      "Puts the ambient layer on a product that runs CopilotKit or any AG-UI agent: the layer runs its questions on the agent and follows its messages.",
    exports: "agUIAgent",
    docs: "Needs the ambient layer. Give the provider an API built from the agent:\n\n  const api = createAmbientApi(agUIAgent(() => agent))\n\nInside CopilotKit, run through it, passing the resume entries on so an approval resumes the run:\n\n  agUIAgent(() => agent, {\n    run: (agent, { resume }) => copilotkit.runAgent({ agent, resume }),\n    stop: (agent) => copilotkit.stopAgent({ agent }),\n  })\n\nSee docs/chat-stacks.md.",
  },
}

/**
 * How the survey recognises each stack, in the order they win: a stack
 * that owns the thread in the browser comes before one that only streams,
 * because a product on assistant-ui usually has `ai` underneath it.
 *
 *   pkg     a dependency that means the stack is installed
 *   ui      the stack's own chat UI, which the layer takes over
 *   wiring  where the stack is set up in the product
 *   proof   when set, the package alone is not enough: the product must
 *           also use the stack this way (a wiring hit counts too). `ai` is
 *           a dependency of servers that never stream a chat to a browser.
 */
export const CHAT_STACKS = [
  {
    id: "assistant-ui",
    door: "stack-assistant-ui",
    pkg: (k) => k === "@assistant-ui/react",
    ui: /<(?:Thread|AssistantModal|AssistantSidebar|ThreadPrimitive\.Root)\b/,
    wiring: /\buse(?:Chat|Local|ExternalStore|LangGraph)Runtime\s*\(/,
  },
  {
    id: "copilotkit",
    door: "stack-ag-ui",
    pkg: (k) => k.startsWith("@copilotkit/"),
    ui: /<(?:CopilotChat|CopilotSidebar|CopilotPopup)\b/,
    wiring: /<(?:CopilotKit|CopilotKitProvider)\b/,
  },
  {
    id: "ag-ui",
    door: "stack-ag-ui",
    pkg: (k) => k === "@ag-ui/client",
    ui: null,
    wiring: /\bnew\s+HttpAgent\s*\(/,
  },
  {
    id: "ai-sdk",
    door: "stack-ai-sdk",
    pkg: (k) => k === "ai" || k === "@ai-sdk/react",
    ui: null,
    wiring: /\buseChat\s*\(|\bnew\s+Chat\s*\(/,
    proof: /\btoUIMessageStreamResponse\s*\(|\bcreateUIMessageStreamResponse\s*\(/,
  },
]
