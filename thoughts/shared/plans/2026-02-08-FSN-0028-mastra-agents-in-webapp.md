# FSN-0028: Embed Mastra Agents in Next.js Webapp

## Overview

Add an "Ask AI" chat tab to the vault detail page that embeds the Mastra `plasmaVaultAgent`. Users can ask questions about the vault they're viewing (TVL, fuses, fees, roles, etc.) and get AI-powered answers. Replace the existing "Performance" tab (placeholder) with the new "Ask AI" tab.

## Current State Analysis

- **Vault page tabs**: URL-based routing with 4 tabs (Overview, Depositors, Activity, Performance). Config in `vault-tabs.config.ts`, each tab is a separate Next.js route.
- **Performance tab**: Placeholder "Coming soon" at `performance/page.tsx` — to be removed.
- **Mastra package**: Standalone at `packages/mastra/`, runs on localhost:4111. Has `plasmaVaultAgent` with 10 tools (vault info, TVL, fuses, fees, roles, fuse explorer). Zero integration with web app.
- **Import blocker**: `env.ts` validates `PONDER_DATABASE_URL` as required at import time. The plasma vault tools don't need it — only SQL tools do. Importing the agent triggers this validation via the import chain: `plasmaVaultAgent` → tools barrel → `viem-clients.ts` → `env.ts`.

### Key Discoveries:

- Barrel exports already exist: `packages/mastra/src/tools/plasma-vault/index.ts` and `packages/mastra/src/tools/fuse-explorer/index.ts`
- `plasmaVaultAgent` uses `env.MODEL` (defaults to `openrouter/anthropic/claude-3-5-haiku-20241022`) — requires `OPENROUTER_API_KEY`
- Vault tools need RPC URLs at runtime (not import time) for on-chain calls
- Fuse explorer tools are pure static data — no env vars needed
- Web app has shadcn components: button, input, card, avatar, skeleton — enough for chat UI
- No existing streaming API routes in the web app

## Desired End State

- User visits `/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/ask-ai`
- Sees a chat interface with an input field and message area
- Can type questions like "What's the TVL of this vault?" or "What fuses does this vault use?"
- Agent responds with streaming text, using its tools to fetch real data
- Agent automatically knows which vault the user is viewing (chainId + address pre-populated)
- Performance tab no longer exists

### Verification:

- Navigate to vault page → "Ask AI" tab visible, "Performance" tab gone
- Click "Ask AI" → chat interface loads
- Type "What is the TVL?" → agent streams a response with actual TVL data
- Type "What fuses does this vault have?" → agent lists the vault's fuses

## What We're NOT Doing

- No memory persistence across page reloads (messages are client-side only)
- No authentication for the chat endpoint (can be added later)
- No rate limiting (can be added later)
- No SQL agent integration (only plasma vault agent)
- No assistant-ui or AI Elements library — custom minimal UI only

## Implementation Approach

Embed the Mastra `plasmaVaultAgent` directly into a Next.js API route. The agent is imported from the workspace `@wgenie/fusion-mastra` package. A lightweight chat UI built with existing shadcn components uses `useChat` from `@ai-sdk/react` to communicate with the streaming API route.

To make this work, we need to fix the import-time env validation in the mastra package so `PONDER_DATABASE_URL` doesn't block imports when only the plasma vault agent is used.

---

## Phase 1: Make Mastra Package Importable from Web App

### Overview

Fix the env validation so importing the plasma vault agent doesn't require `PONDER_DATABASE_URL`. Add proper package exports for external consumption.

### Changes Required:

#### 1. Make `PONDER_DATABASE_URL` optional in env schema

**File**: `packages/mastra/src/env.ts`
**Change**: Make `PONDER_DATABASE_URL` optional with runtime validation in SQL tools

```typescript
// Before (line 16-18):
PONDER_DATABASE_URL: z
  .string()
  .url('PONDER_DATABASE_URL must be a valid PostgreSQL connection URL'),

// After:
PONDER_DATABASE_URL: z
  .string()
  .url('PONDER_DATABASE_URL must be a valid PostgreSQL connection URL')
  .optional(),
```

Update `FUSION_PONDER_CONNECTION_STRING` export (line 47):
```typescript
// Before:
export const FUSION_PONDER_CONNECTION_STRING = env.PONDER_DATABASE_URL;

// After:
export const FUSION_PONDER_CONNECTION_STRING = env.PONDER_DATABASE_URL ?? '';
```

#### 2. Add runtime validation in SQL tools

**File**: `packages/mastra/src/tools/database-introspection-tool.ts`
**Change**: Add runtime check before using connection string

In the `execute` function, add at the top:
```typescript
if (!FUSION_PONDER_CONNECTION_STRING) {
  return { success: false, error: 'PONDER_DATABASE_URL is not configured' };
}
```

**File**: `packages/mastra/src/tools/sql-execution-tool.ts`
**Change**: Same runtime check

#### 3. Add exports field to mastra package.json

**File**: `packages/mastra/package.json`
**Change**: Add exports for external consumption

```json
{
  "exports": {
    ".": "./src/mastra/index.ts",
    "./agents": "./src/agents/index.ts",
    "./agents/*": "./src/agents/*"
  }
}
```

#### 4. Create agents barrel export

**File**: `packages/mastra/src/agents/index.ts` (new)
```typescript
export { plasmaVaultAgent } from './plasma-vault-agent';
export { sqlAgent } from './sql-agent';
```

### Success Criteria:

#### Automated Verification:

- [ ] `cd packages/mastra && pnpm run build` completes without errors
- [ ] Existing mastra dev server still works: `cd packages/mastra && pnpm run dev`

#### Manual Verification:

- [ ] Mastra Studio agents still respond correctly at localhost:4111

---

## Phase 2: Add Dependencies to Web App

### Overview

Install the required packages for AI chat functionality in the web app.

### Changes Required:

#### 1. Add dependencies to web package.json

**File**: `packages/web/package.json`
**Change**: Add to `dependencies`:

```json
{
  "@wgenie/fusion-mastra": "workspace:*",
  "@mastra/core": "^1.2.0",
  "ai": "^4.3.16",
  "@ai-sdk/react": "^1.0.0",
  "@ai-sdk/openai": "^1.3.22"
}
```

Then run `pnpm install` from the monorepo root.

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm install` completes without errors
- [ ] `cd packages/web && pnpm run build` still compiles (no breaking imports)

---

## Phase 3: Create Chat API Route

### Overview

Create a streaming POST endpoint that receives chat messages, injects vault context, and streams the agent's response.

### Changes Required:

#### 1. Create chat API route

**File**: `packages/web/src/app/api/vaults/[chainId]/[address]/chat/route.ts` (new)

```typescript
import { NextRequest } from 'next/server';
import { isAddress } from 'viem';
import { plasmaVaultAgent } from '@wgenie/fusion-mastra/agents';
import { getVaultFromRegistry, getChainName } from '@/lib/vaults-registry';
import { isValidChainId } from '@/app/chains.config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; address: string }> },
) {
  const { chainId: chainIdStr, address } = await params;
  const chainId = parseInt(chainIdStr, 10);

  if (isNaN(chainId) || !isValidChainId(chainId) || !isAddress(address, { strict: false })) {
    return new Response('Invalid parameters', { status: 400 });
  }

  const vault = getVaultFromRegistry(chainId, address);
  const chainName = getChainName(chainId);
  const { messages } = await request.json();

  // Inject vault context as first system message
  const vaultContext = `CURRENT VAULT CONTEXT: The user is viewing vault "${vault?.name ?? 'Unknown'}" at address ${address} on ${chainName} (chainId: ${chainId}). When the user asks about "this vault", "the vault", or asks questions without specifying a vault, use chainId=${chainId} and vaultAddress="${address}" with your tools.`;

  const messagesWithContext = [
    { role: 'system' as const, content: vaultContext },
    ...messages,
  ];

  const result = await plasmaVaultAgent.stream(messagesWithContext);
  return result.toDataStreamResponse();
}
```

**Note**: The exact API for `agent.stream()` and `toDataStreamResponse()` needs to be verified against the installed Mastra version. The pattern follows the Mastra + AI SDK integration docs. If `agent.stream()` doesn't return an object with `toDataStreamResponse()`, we may need to use `streamText` from the `ai` package directly with the agent's model and tools.

**Fallback pattern** (if direct agent streaming doesn't work):
```typescript
import { streamText } from 'ai';
// Use agent's model and tools directly with streamText
```

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles: `cd packages/web && npx tsc --noEmit` (or check during build)
- [ ] Route responds to POST requests

#### Manual Verification:

- [ ] `curl -X POST http://localhost:3000/api/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"What is the TVL?"}]}'` returns a streaming response

**Implementation Note**: After completing this phase, pause for manual testing to verify the API route works correctly before building the UI.

---

## Phase 4: Create Chat UI Component

### Overview

Build a minimal chat interface using existing shadcn components and the `useChat` hook from `@ai-sdk/react`.

### Changes Required:

#### 1. Create the chat component

**File**: `packages/web/src/vault-details/components/vault-ask-ai.tsx` (new)

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SendHorizontal, Bot, User } from 'lucide-react';
import type { ChainId } from '@/app/chains.config';
import type { Address } from 'viem';

interface Props {
  chainId: ChainId;
  vaultAddress: Address;
}

export function VaultAskAi({ chainId, vaultAddress }: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: `/api/vaults/${chainId}/${vaultAddress}/chat`,
  });

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
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
            <div
              className={cn(
                'rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted',
              )}
            >
              {message.content}
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <Skeleton className="h-8 w-48 rounded-lg" />
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive text-center">
            Something went wrong. Please try again.
          </div>
        )}
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

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles without errors

#### Manual Verification:

- [ ] Component renders correctly on the vault page
- [ ] Messages display with proper styling (user right-aligned, assistant left-aligned)
- [ ] Loading state shows skeleton while waiting for response
- [ ] Error state shows error message

---

## Phase 5: Update Tabs and Routes

### Overview

Replace the Performance tab with Ask AI. Create the new route page, delete the old one.

### Changes Required:

#### 1. Update tab configuration

**File**: `packages/web/src/vault-details/vault-tabs.config.ts`
**Change**: Replace performance tab with ask-ai

```typescript
// Replace the performance entry:
{
  id: 'performance',
  label: 'Performance',
  description: 'Performance metrics and analytics',
},

// With:
{
  id: 'ask-ai',
  label: 'Ask AI',
  description: 'Chat with AI about this vault',
},
```

#### 2. Create Ask AI route page

**File**: `packages/web/src/app/vaults/[chainId]/[address]/ask-ai/page.tsx` (new)

```typescript
import { VaultAskAi } from '@/vault-details/components/vault-ask-ai';

export const metadata = {
  title: 'Ask AI - Fusion by wGenie',
};

export default async function VaultAskAiPage({
  params,
}: {
  params: Promise<{ chainId: string; address: string }>;
}) {
  const { chainId, address } = await params;

  return (
    <VaultAskAi
      chainId={Number(chainId) as any}
      vaultAddress={address as `0x${string}`}
    />
  );
}
```

#### 3. Delete Performance page

**File**: `packages/web/src/app/vaults/[chainId]/[address]/performance/page.tsx` (delete)

### Success Criteria:

#### Automated Verification:

- [ ] TypeScript compiles
- [ ] `cd packages/web && pnpm run build` succeeds

#### Manual Verification:

- [ ] Tab bar shows "Ask AI" instead of "Performance"
- [ ] Clicking "Ask AI" navigates to `/vaults/[chainId]/[address]/ask-ai`
- [ ] Chat interface loads and is functional
- [ ] Other tabs still work correctly

**Implementation Note**: After completing this phase, pause for full end-to-end manual testing with Playwright MCP.

---

## Phase 6: Environment Setup

### Overview

Document and configure the required environment variables for the web app.

### Changes Required:

The web app's `.env.local` needs the following for the AI chat to work:

```env
# Required for AI chat (Mastra agent)
OPENROUTER_API_KEY=sk-or-...          # OpenRouter API key for LLM
ETHEREUM_RPC_URL=https://...           # Already likely present as RPC_URL_MAINNET
ARBITRUM_RPC_URL=https://...           # Already likely present as RPC_URL_ARBITRUM
BASE_RPC_URL=https://...               # Already likely present as RPC_URL_BASE
```

**Note**: The mastra package uses different env var names for RPC URLs than the web app (`ETHEREUM_RPC_URL` vs `RPC_URL_MAINNET`). Either:
- Set both sets of env vars, or
- Refactor viem-clients.ts to also check the web app's env var names (out of scope for this ticket, but worth noting)

### Success Criteria:

#### Manual Verification:

- [ ] Chat works end-to-end with real data
- [ ] Agent can fetch vault TVL, fuses, fees via on-chain RPC calls

---

## Testing Strategy

### Manual Testing Steps:

1. Start web app: `cd packages/web && pnpm run dev`
2. Navigate to http://localhost:3000/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f
3. Verify "Ask AI" tab is visible, "Performance" tab is gone
4. Click "Ask AI" tab
5. Verify chat interface renders with placeholder text
6. Type "What is the TVL of this vault?" and submit
7. Verify streaming response appears with actual TVL data
8. Type "What fuses does this vault have?" and submit
9. Verify response lists the vault's fuses
10. Test error handling: disconnect RPC and verify graceful error

### Browser Testing (Playwright MCP):

Use Playwright MCP to automate browser testing:
- Navigate to vault page
- Take screenshot of tab bar
- Click Ask AI tab
- Take screenshot of chat interface
- Verify elements render correctly

## Performance Considerations

- Agent responses stream progressively — no blocking waits
- `useChat` manages message state client-side, minimal server state
- No memory persistence means no database overhead per chat session
- The mastra package's tools make RPC calls on-demand; no preloading

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0028-mastra-agents-in-webapp.md`
- Mastra Next.js integration docs: https://mastra.ai/docs/frameworks/next-js
- AI SDK useChat docs: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat
- Vault tabs config: `packages/web/src/vault-details/vault-tabs.config.ts`
- Plasma vault agent: `packages/mastra/src/agents/plasma-vault-agent.ts`
