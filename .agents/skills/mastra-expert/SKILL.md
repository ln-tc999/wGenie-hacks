---
name: mastra-expert
description: Specialized expert for Mastra v1.2.0 framework. Use when Gemini CLI needs to develop or optimize AI agents, tools, workflows, or memory management within the Mastra ecosystem.
---

# Mastra Expert

Guiding the development of agentic applications using Mastra v1.2.0.

## Documentation
- **Core Guide**: See [development.md](references/development.md) for concepts and best practices.

## Common Tasks

### Creating a Tool
1. Define `inputSchema` using Zod.
2. Implement `execute` with proper error handling.
3. Export from `index.ts` in the tools directory.

### Designing a Workflow
1. Identify steps (nodes).
2. Define transitions and conditions.
3. Use `wgenieCfoWorkingMemorySchema` for state persistence between steps.

## Project Context
- AI server is in `packages/mastra/`.
- Agents are served via Hono API in `packages/mastra/src/mastra/index.ts` or similar.
- Local storage uses LibSQL for agent memory.
