# Alpha Agent with UI Component Rendering — Implementation Plan

## Overview

Create a new `alpha-agent` in Mastra that can display placeholder UI components in chat (e.g., "transactions to sign"). Wire it into the vault "Ask AI" tab, replacing the existing `plasmaVaultAgent`, using the `@mastra/ai-sdk` integration package for proper tool call streaming so the frontend can render custom React components for tool outputs.

## Current State Analysis

- **Mastra**: 2 agents exist (`plasmaVaultAgent`, `sqlAgent`) in `packages/mastra/src/agents/`
- **Chat UI**: `vault-ask-ai.tsx` uses `useChat` from `@ai-sdk/react` with `streamProtocol: 'text'`, rendering only `message.content` as plain text
- **API route**: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts` streams `plasmaVaultAgent` responses via manual `TextEncoder` on `result.textStream` — text only, no tool calls visible to frontend
- **AI SDK versions**: `ai@4.3.19`, `@ai-sdk/react@1.2.12`
- **`@mastra/ai-sdk` NOT installed** — this is the recommended integration package

### Key Discoveries:

- Mastra docs recommend `handleChatStream()` from `@mastra/ai-sdk` + `createUIMessageStreamResponse()` from `ai` for Next.js integration (`guides/build-your-ui/ai-sdk-ui.md`)
- Tool outputs render as `tool-{toolKey}` parts in `message.parts` with states: `input-available`, `output-available`, `output-error`
- `createUIMessageStreamResponse()` is an AI SDK v5 function — current `ai@4.3.19` is v4 and likely does NOT have it. **Upgrade to `ai@5.x` required.**
- Mastra's `MastraModelOutput` has `fullStream` with all chunk types including tool calls, and `convertMastraChunkToAISDKv5` utility for conversion

## Desired End State

1. A new `alpha-agent` registered in Mastra with a `displayTransactions` tool
2. The vault "Ask AI" tab uses the alpha-agent (not plasmaVaultAgent)
3. When the agent calls `displayTransactions`, the frontend renders a placeholder card component instead of raw JSON
4. Text messages render normally alongside tool call components
5. The chat uses AI SDK data protocol (not text-only streaming)

### Verification:
- Navigate to `/vaults/1/0x87428d886f43068a44d7bdeef106d3c42e1d6f23/ask-ai`
- Type "Display alpha transactions to sign"
- Agent responds with text + a rendered placeholder card component

## What We're NOT Doing

- Real transaction data — the UI component is a placeholder
- Agent switching UI — we replace plasmaVaultAgent with alpha-agent in the Ask AI tab
- Upgrading the existing plasmaVaultAgent chat in Mastra Studio — it stays as is
- Memory/history features beyond what already exists

## Implementation Approach

Use `@mastra/ai-sdk` (Mastra's official AI SDK integration package) with `handleChatStream()` for the backend and `message.parts` rendering on the frontend. This is the documented, recommended approach from Mastra.

---

## Phase 1: Create Alpha Agent in Mastra

### Overview
Create the new agent with a `displayTransactions` tool that returns structured data. The frontend will render this as a UI component.

### Changes Required:

#### 1. Create displayTransactions tool

**File**: `packages/mastra/src/tools/alpha/display-transactions.ts` (new)

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const displayTransactionsTool = createTool({
  id: 'display-transactions',
  description:
    'Display a placeholder UI component showing transactions to sign. Call this tool when the user asks to see, show, or display transactions to sign.',
  inputSchema: z.object({
    message: z
      .string()
      .optional()
      .describe('Optional message to display with the transactions'),
  }),
  outputSchema: z.object({
    type: z.literal('transactions-to-sign'),
    message: z.string(),
    placeholder: z.literal(true),
  }),
  execute: async ({ message }) => {
    return {
      type: 'transactions-to-sign' as const,
      message: message ?? 'Alpha transactions ready to sign',
      placeholder: true as const,
    };
  },
});
```

#### 2. Create tool index

**File**: `packages/mastra/src/tools/alpha/index.ts` (new)

```typescript
export { displayTransactionsTool } from './display-transactions';
```

#### 3. Create alpha-agent

**File**: `packages/mastra/src/agents/alpha-agent.ts` (new)

```typescript
import { Agent } from '@mastra/core/agent';
import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { env } from '../env';
import { displayTransactionsTool } from '../tools/alpha';

const memory = new Memory({
  storage: new LibSQLStore({
    id: 'alpha-agent-memory',
    url: 'file:./mastra.db',
  }),
});

export const alphaAgent = new Agent({
  id: 'alpha-agent',
  name: 'Alpha Agent',
  instructions: `You are an Alpha Agent for wGenie Fusion Plasma Vaults.

## YOUR CAPABILITIES

You can display UI components to the user. When the user asks to see, show, or display transactions to sign, use the displayTransactions tool.

## GUIDELINES

- When the user mentions "transactions to sign", "alpha transactions", or asks to display/show transactions, ALWAYS call the displayTransactions tool
- You can include a brief text message before or after calling the tool
- Keep responses concise`,
  model: env.MODEL,
  tools: {
    displayTransactionsTool,
  },
  memory,
});
```

#### 4. Register alpha-agent

**File**: `packages/mastra/src/agents/index.ts`
**Changes**: Add export for alphaAgent

```typescript
export { plasmaVaultAgent } from './plasma-vault-agent';
export { sqlAgent } from './sql-agent';
export { alphaAgent } from './alpha-agent';
```

**File**: `packages/mastra/src/mastra/index.ts`
**Changes**: Import and register alphaAgent

```typescript
import { alphaAgent } from '../agents/alpha-agent';
// ...
agents: { sqlAgent, plasmaVaultAgent, alphaAgent },
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/mastra && npx tsc --noEmit`
- [ ] Mastra dev starts: `cd packages/mastra && pnpm dev` (should show alpha-agent in studio)

#### Manual Verification:
- [ ] Alpha agent visible in Mastra Studio at localhost:4111
- [ ] Sending "display transactions to sign" in Studio shows tool call + result

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Install @mastra/ai-sdk and Upgrade AI SDK

### Overview
Install the Mastra AI SDK integration package and upgrade the `ai` package to v5+ to get `createUIMessageStreamResponse()`.

### Changes Required:

#### 1. Install packages in web app

Run in `packages/web`:

```bash
pnpm add @mastra/ai-sdk@latest
pnpm add ai@latest @ai-sdk/react@latest
```

**Note**: Upgrading `ai` from v4 to v5 may introduce breaking changes. The main one relevant to us is `message.content` → `message.parts`. Since we're rewriting the chat component anyway, this is fine. Check for any other usages of `useChat` or `ai` imports in the web app.

#### 2. Verify no other `ai` package usages break

Search for other imports from `ai` or `@ai-sdk/react` in the web app. The only known usage is in `vault-ask-ai.tsx` (which we're rewriting in Phase 4) and the chat API route (which we're rewriting in Phase 3).

### Success Criteria:

#### Automated Verification:
- [ ] `pnpm install` succeeds without errors
- [ ] `cd packages/web && npx tsc --noEmit` compiles (may have type errors we fix in Phase 3-4)

#### Manual Verification:
- [ ] Web app still starts: `cd packages/web && pnpm dev`

**Implementation Note**: After completing this phase, proceed to Phase 3 immediately (the app may have temporary type errors until the route and component are updated).

---

## Phase 3: Update API Route to Use handleChatStream

### Overview
Replace the manual text streaming with `handleChatStream()` from `@mastra/ai-sdk`, which properly streams tool calls in AI SDK format.

### Changes Required:

#### 1. Rewrite chat API route

**File**: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts`
**Changes**: Replace entire implementation

```typescript
import { NextRequest } from 'next/server';
import { isAddress } from 'viem';
import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from '@wgenie/fusion-mastra';
import { getVaultFromRegistry, getChainName } from '@/lib/vaults-registry';
import { isValidChainId } from '@/app/chains.config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId: chainIdStr, address } = await params;
  const chainId = parseInt(chainIdStr, 10);

  if (
    isNaN(chainId) ||
    !isValidChainId(chainId) ||
    !isAddress(address, { strict: false })
  ) {
    return new Response('Invalid parameters', { status: 400 });
  }

  const vault = getVaultFromRegistry(chainId, address);
  const chainName = getChainName(chainId);
  const body = await request.json();

  const vaultContext = `CURRENT VAULT CONTEXT: The user is viewing vault "${vault?.name ?? 'Unknown'}" at address ${address} on ${chainName} (chainId: ${chainId}). When the user asks about "this vault", use this context.`;

  // Inject vault context as a system message into the params
  const messages = body.messages ?? [];
  const messagesWithContext = [
    { role: 'system' as const, content: vaultContext },
    ...messages,
  ];

  try {
    const stream = await handleChatStream({
      mastra,
      agentId: 'alphaAgent',
      params: {
        ...body,
        messages: messagesWithContext,
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('Error in agent stream', error);
    return new Response('An error occurred while processing your request.', {
      status: 500,
    });
  }
}
```

**Key changes**:
- Import `handleChatStream` from `@mastra/ai-sdk` and `createUIMessageStreamResponse` from `ai`
- Import `mastra` instance from `@wgenie/fusion-mastra` (not agent directly)
- Use `agentId: 'alphaAgent'` to reference the agent by its key in the Mastra instance
- Pass modified messages with vault context through `params`
- Return `createUIMessageStreamResponse({ stream })` instead of manual Response

**Note on message format**: `handleChatStream` expects AI SDK v5 message format (with `parts`). The `useChat` hook on the frontend will send messages in the correct format after we update it. The system message injection should still work — verify during implementation that `handleChatStream` accepts messages with plain `content` field for system messages.

**Fallback approach**: If `handleChatStream` doesn't support injecting system messages easily, we can fall back to using `alphaAgent.stream()` directly with `toAISdkStream()` from `@mastra/ai-sdk`:

```typescript
import { toAISdkStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';

// ...
const result = await alphaAgent.stream(messagesWithContext, {
  maxSteps: 5,
  maxTokens: 4096,
});
const stream = toAISdkStream(result);
return createUIMessageStreamResponse({ stream });
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`

#### Manual Verification:
- [ ] API route responds to POST requests (test with curl or from the UI after Phase 4)

**Implementation Note**: The chat UI won't work correctly until Phase 4 is complete. Proceed immediately.

---

## Phase 4: Update Chat UI to Render Tool Call Parts

### Overview
Switch the chat component from text-only rendering to `message.parts` rendering, and add a custom component for the `displayTransactions` tool output.

### Changes Required:

#### 1. Create TransactionsToSign placeholder component

**File**: `packages/web/src/vault-details/components/transactions-to-sign.tsx` (new)

```tsx
import { Card } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface Props {
  message: string;
}

export function TransactionsToSign({ message }: Props) {
  return (
    <Card className="p-4 border-dashed border-2 bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{message}</p>
          <p className="text-xs text-muted-foreground">Placeholder component</p>
        </div>
      </div>
    </Card>
  );
}
```

#### 2. Rewrite VaultAskAi to use message.parts

**File**: `packages/web/src/vault-details/components/vault-ask-ai.tsx`
**Changes**: Replace entire implementation

```tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SendHorizontal, Bot, User, Loader2 } from 'lucide-react';
import { TransactionsToSign } from './transactions-to-sign';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function VaultAskAi({ chainId, vaultAddress }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: `/api/vaults/${chainId}/${vaultAddress}/chat`,
      // Default data protocol — no streamProtocol: 'text'
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Bot className="w-8 h-8" />
            <p>Ask anything about this vault</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 text-sm',
              message.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="max-w-[80%] space-y-2">
              {message.parts.map((part, index) => {
                // Render text parts
                if (part.type === 'text') {
                  return (
                    <div
                      key={index}
                      className={cn(
                        'rounded-lg px-3 py-2 whitespace-pre-wrap',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                      )}
                    >
                      {part.text}
                    </div>
                  );
                }

                // Render displayTransactions tool output
                if (part.type === 'tool-displayTransactionsTool') {
                  if (part.state === 'output-available') {
                    return (
                      <TransactionsToSign
                        key={index}
                        message={part.output.message}
                      />
                    );
                  }
                  if (
                    part.state === 'input-available' ||
                    part.state === 'input-streaming'
                  ) {
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading transactions...</span>
                      </div>
                    );
                  }
                  return null;
                }

                return null;
              })}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="text-sm text-destructive text-center">
            Something went wrong. Please try again.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about this vault..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <SendHorizontal className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
```

**Key changes**:
- Removed `streamProtocol: 'text'` — uses default data protocol
- Renders `message.parts` instead of `message.content`
- Text parts render as styled bubbles (same as before)
- `tool-displayTransactionsTool` parts render the `TransactionsToSign` component when `output-available`
- Shows loading spinner during `input-available`/`input-streaming` states
- Tool part type is `tool-displayTransactionsTool` because the tool key in the agent's `tools` object is `displayTransactionsTool`

**Note on AI SDK v5 useChat API**: The `useChat` API may have changed slightly in v5 (e.g., `handleSubmit` → `sendMessage`). Verify the exact API during implementation and adjust accordingly. If the v5 API uses `sendMessage`, the form handling will need updating.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit`
- [ ] Web app builds: `cd packages/web && pnpm build`

#### Manual Verification:
- [ ] Navigate to `/vaults/1/0x87428d886f43068a44d7bdeef106d3c42e1d6f23/ask-ai`
- [ ] Type "hello" — agent responds with text, rendered normally
- [ ] Type "Display alpha transactions to sign" — agent calls tool and placeholder card renders in chat
- [ ] Text messages before/after the tool call render correctly
- [ ] Loading spinner shows briefly while tool executes
- [ ] Error handling still works (disconnect network, verify error message)

**Implementation Note**: After completing this phase and all verification passes, pause for manual testing.

---

## Phase 5: Browser Testing with Playwright MCP

### Overview
Test the full flow using Playwright MCP browser automation.

### Test Steps:

1. Navigate to `http://localhost:3000/vaults/1/0x87428d886f43068a44d7bdeef106d3c42e1d6f23/ask-ai`
2. Authenticate if needed (use fusion-dev-auth skill)
3. Type "Display alpha transactions to sign" in the chat input
4. **Ask user to press Enter** (per CLAUDE.md instructions — browser automation cannot reliably submit in agent chat)
5. Wait for response and take snapshot
6. Verify:
   - Agent text response appears
   - Placeholder "Transactions to sign" card component renders
   - No errors in the chat

### Success Criteria:

#### Manual Verification:
- [ ] Chat input accepts text
- [ ] Agent responds with tool call + text
- [ ] Placeholder card renders visually in the chat
- [ ] No console errors

---

## Testing Strategy

### Unit Tests:
- None needed for this phase — the feature is a UI integration with minimal logic

### Integration Tests:
- End-to-end browser test covers the full flow (Phase 5)

### Manual Testing Steps:
1. Start Mastra dev server: `cd packages/mastra && pnpm dev`
2. Start web app: `cd packages/web && pnpm dev`
3. Navigate to vault Ask AI tab
4. Test "Display alpha transactions to sign" → should render placeholder card
5. Test regular text questions → should render text normally
6. Test error cases → should show error message

## Performance Considerations

- Switching from text protocol to data protocol adds minimal overhead (SSE framing)
- The `handleChatStream` approach is the same one Mastra uses internally for their Studio

## Migration Notes

- The `ai` package upgrade from v4 to v5 may require verifying the `useChat` API surface
- The `message.parts` rendering pattern replaces `message.content` — this is a one-way migration
- If `createUIMessageStreamResponse` is not available, fall back to `toAISdkStream()` + manual response construction

## Risks and Mitigations

1. **AI SDK v4→v5 breaking changes**: The `useChat` API may have changed (e.g., `handleSubmit` → `sendMessage`). Mitigation: check the actual installed API during implementation and adjust.
2. **`handleChatStream` message format**: May expect v5 message format with `parts` instead of `content`. Mitigation: fallback to using `alphaAgent.stream()` directly with `toAISdkStream()`.
3. **Tool part type naming**: The type `tool-displayTransactionsTool` depends on the key name in the agent's `tools` object. Verify during implementation.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0031-alpha-agent.md`
- Mastra AI SDK UI guide: `guides/build-your-ui/ai-sdk-ui.md`
- Mastra MastraModelOutput reference: `reference/streaming/agents/MastraModelOutput.md`
- Existing chat API route: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts`
- Existing chat UI: `packages/web/src/vault-details/components/vault-ask-ai.tsx`
- Mastra agent definitions: `packages/mastra/src/agents/`
