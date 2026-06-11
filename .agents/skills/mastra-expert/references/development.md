# Mastra v1.2.0 Development Guide

## Core Concepts

### Agents
- Define agents in `packages/mastra/src/agents/`.
- Use `Agent` class with `id`, `name`, `instructions`, `model`, and `tools`.
- Instructions should be comprehensive and define the agent's persona and logic.

### Tools
- Define tools in `packages/mastra/src/tools/`.
- Use `createTool` with `id`, `description`, `inputSchema` (zod), and `execute`.
- Tools should return structured data that the UI or other tools can consume.

### Workflows
- Workflows allow multi-step, logic-gated processes.
- Use `Workflow` class to chain steps.
- Steps can be tool calls, logic branches, or manual approvals.

### Memory
- Use `Memory` class to persist conversation history and "Working Memory" for pending actions.
- Configure storage (e.g., LibSQL or PostgreSQL).

## Best Practices
- **Atomic Tools**: Each tool should do one thing well (e.g., `readBalance`, `encodeSwap`).
- **Structured Output**: Always use Zod schemas for `outputSchema`.
- **Error Handling**: Catch errors inside `execute` and return descriptive error messages in the output.
- **Provider Gateway**: Use the `Mastra` class to manage model providers (OpenAI, Anthropic, NVIDIA).
