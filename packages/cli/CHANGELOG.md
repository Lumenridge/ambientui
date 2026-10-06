# @ambient-ui/cli

## 0.2.0

### Minor Changes

- The layer runs on a product's chat stack. Adapters build the Ambient API from the Vercel AI SDK (`aiSdkRoute`, `aiSdkChat`), assistant-ui (`assistantUIThread`) and CopilotKit or any AG-UI agent (`agUIAgent`), each its own import (`ambientui/stack-ai-sdk`, `ambientui/stack-assistant-ui`, `ambientui/stack-ag-ui`) and registry door. The Ambient API gains `respond`, `reset` and `conversation`, and `regenerate` on a question; a block may carry an `id` and be replaced in place. New in the tool kit: `ToolApproval`; `ToolCall` takes the product's own component for a tool as children, given through `toolComponents` or `renderTool` on `AssistantProvider`. `ambientui doctor` detects the stack and plans its door.
