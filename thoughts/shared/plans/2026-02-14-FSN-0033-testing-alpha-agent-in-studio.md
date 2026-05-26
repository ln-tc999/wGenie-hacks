# FSN-0033: Alpha Agent Discriminated Output Types & Mastra-Native API

## Overview

Formalize the alpha agent's tool output pattern using a discriminated union with a `type` field so that:
- **Mastra Studio** (localhost:4111): Shows raw JSON — user inspects the `type` field to verify agent behavior
- **Web app** (localhost:3000): Reads the `type` field and renders the appropriate custom React component
- **Mastra-native API**: `chatRoute()` exposes all agents via AI SDK-compatible streaming at `http://localhost:4111/chat/:agentId`

The discriminated `type` field is the contract between Mastra and the web app. Adding a new UI component in the future is: (1) add type to union, (2) create tool, (3) add component + case to renderer.

## Current State Analysis

- `displayTransactionsTool` already returns `{ type: 'transactions-to-sign', message, placeholder }` (`packages/mastra/src/tools/alpha/display-transactions.ts:14-18`)
- Web app renders it via hardcoded `part.type === 'tool-displayTransactionsTool'` check (`packages/web/src/vault-details/components/vault-ask-ai.tsx:86`)
- Mastra server has no `server` config — no `chatRoute()`, no CORS (`packages/mastra/src/mastra/index.ts`)
- `@mastra/ai-sdk` is NOT a dependency of the mastra package (only in web app)
- Package exports only `"."` and `"./agents"` — no types export (`packages/mastra/package.json:6-9`)

## Desired End State

1. **Mastra server** exposes `chatRoute()` at `/chat/:agentId` with CORS — all agents accessible via Mastra-native API
2. **Discriminated union type** `AlphaToolOutput` exported from `@wgenie/fusion-mastra/alpha-types` with `type` as discriminator
3. **Web app** uses a generic tool renderer that switches on `output.type` instead of hardcoding tool part names
4. **Extensible**: Adding future output types (single transaction, balances, execute button, receipt, simulation) requires only adding to the union + adding a component case

### Verification:
- In Mastra Studio: Chat with alpha agent, ask "show transactions" → see JSON with `type: "transactions-to-sign"` field
- In web app ask-ai: Same prompt → see `TransactionsToSign` placeholder card component
- `curl -X POST http://localhost:4111/chat/alphaAgent` with messages → get AI SDK-compatible stream

## What We're NOT Doing

- Implementing actual transaction list, balances, execute, receipt, or simulation features — all stay as placeholders
- Customizing Mastra Studio's built-in chat UI — Studio shows raw JSON, that's fine
- Creating a separate testing environment — the existing ask-ai page is sufficient
- Changing the web app's API route architecture — it keeps importing the agent directly

## Implementation Approach

Three changes that work together:
1. **Mastra server config**: Add `chatRoute()` for Mastra-native API access
2. **Type system**: Formalize discriminated union in mastra package, export it
3. **Web app rendering**: Generic renderer that dispatches on `output.type`

---

## Phase 1: Add chatRoute() to Mastra Server

### Overview
Register `chatRoute()` with dynamic agent routing so all agents are accessible via Mastra-native AI SDK-compatible API. This makes the alpha agent testable from any AI SDK-compatible frontend.

### Changes Required:

#### 1. Install @mastra/ai-sdk in mastra package

```bash
cd packages/mastra && pnpm add @mastra/ai-sdk@latest
```

#### 2. Add server config with chatRoute

**File**: `packages/mastra/src/mastra/index.ts`
**Changes**: Add `chatRoute()` and CORS to server config

```typescript
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { chatRoute } from '@mastra/ai-sdk';
import { sqlAgent } from '../agents/sql-agent';
import { plasmaVaultAgent } from '../agents/plasma-vault-agent';
import { alphaAgent } from '../agents/alpha-agent';
import { databaseQueryWorkflow } from '../workflows/database-query-workflow';

export const mastra = new Mastra({
  workflows: { databaseQueryWorkflow },
  agents: { sqlAgent, plasmaVaultAgent, alphaAgent },
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
  server: {
    cors: {
      origin: '*',
      allowMethods: ['*'],
      allowHeaders: ['*'],
    },
    apiRoutes: [
      chatRoute({
        path: '/chat/:agentId',
      }),
    ],
  },
});
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && pnpm install` succeeds
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles

#### Manual Verification:
- [ ] `cd packages/mastra && pnpm dev` starts without errors
- [ ] Alpha agent still visible and functional in Studio at `http://localhost:4111/agents/alpha-agent`
- [ ] `curl -X POST http://localhost:4111/chat/alphaAgent -H 'Content-Type: application/json' -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"hello"}]}]}'` returns a streaming response

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 2: Define Discriminated Output Type System

### Overview
Create a shared types file that defines the discriminated union for all alpha tool outputs. The `type` field is the discriminator. Export from the mastra package so the web app can import for type safety.

### Changes Required:

#### 1. Create alpha output types

**File**: `packages/mastra/src/tools/alpha/types.ts` (new)

```typescript
/**
 * Discriminated union for all Alpha Agent tool outputs.
 *
 * The `type` field is the discriminator — the web app uses it to decide
 * which React component to render for each tool output.
 *
 * Adding a new output type:
 * 1. Add the type to this union
 * 2. Create a tool in this directory that returns it
 * 3. Add a component + case in the web app's alpha-tool-renderer
 */

/** Placeholder: displays a list of transactions to sign */
export type TransactionsToSignOutput = {
  type: 'transactions-to-sign';
  message: string;
  placeholder: true;
};

// Future output types (do NOT implement yet):
// - 'single-transaction': details of one transaction
// - 'balances': token/position balances
// - 'execute-button': action button to execute transactions
// - 'transaction-receipt': result after execution
// - 'simulation-result': simulation output before execution

/** Union of all alpha tool output types */
export type AlphaToolOutput = TransactionsToSignOutput;
// Future: | SingleTransactionOutput | BalancesOutput | ExecuteButtonOutput | ...
```

#### 2. Export types from alpha tools index

**File**: `packages/mastra/src/tools/alpha/index.ts`
**Changes**: Add types export

```typescript
export { displayTransactionsTool } from './display-transactions';
export type { AlphaToolOutput, TransactionsToSignOutput } from './types';
```

#### 3. Add package export for types

**File**: `packages/mastra/package.json`
**Changes**: Add `./alpha-types` export path

```json
{
  "exports": {
    ".": "./src/mastra/index.ts",
    "./agents": "./src/agents/index.ts",
    "./alpha-types": "./src/tools/alpha/types.ts"
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/mastra && npx tsc --noEmit` compiles
- [ ] Types importable: `import type { AlphaToolOutput } from '@wgenie/fusion-mastra/alpha-types'` resolves in web app

---

## Phase 3: Create Extensible Tool Renderer in Web App

### Overview
Replace the hardcoded `part.type === 'tool-displayTransactionsTool'` check with a generic renderer that:
1. Detects any tool part (`part.type.startsWith('tool-')`)
2. When output is available, reads `output.type` discriminator
3. Dispatches to the matching React component
4. Falls back to raw JSON for unknown types

### Changes Required:

#### 1. Create alpha tool renderer

**File**: `packages/web/src/vault-details/components/alpha-tool-renderer.tsx` (new)

```tsx
import { Loader2 } from 'lucide-react';
import { TransactionsToSign } from './transactions-to-sign';
import type { AlphaToolOutput } from '@wgenie/fusion-mastra/alpha-types';

interface ToolPartProps {
  state: string;
  output?: unknown;
}

/**
 * Renders alpha agent tool outputs based on the discriminated `type` field.
 *
 * Adding a new component:
 * 1. Add the output type in packages/mastra/src/tools/alpha/types.ts
 * 2. Create a React component in this directory
 * 3. Add a case to the switch below
 */
export function AlphaToolRenderer({ state, output }: ToolPartProps) {
  if (state === 'input-available' || state === 'input-streaming') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Processing...</span>
      </div>
    );
  }

  if (state !== 'output-available' || !output) {
    return null;
  }

  const typed = output as AlphaToolOutput;

  switch (typed.type) {
    case 'transactions-to-sign':
      return <TransactionsToSign message={typed.message} />;
    // Future cases:
    // case 'single-transaction': return <SingleTransaction {...typed} />;
    // case 'balances': return <Balances {...typed} />;
    // case 'execute-button': return <ExecuteButton {...typed} />;
    // case 'transaction-receipt': return <TransactionReceipt {...typed} />;
    // case 'simulation-result': return <SimulationResult {...typed} />;
    default:
      return (
        <pre className="text-xs bg-muted rounded p-2 overflow-auto">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
}
```

#### 2. Update vault-ask-ai to use AlphaToolRenderer

**File**: `packages/web/src/vault-details/components/vault-ask-ai.tsx`
**Changes**: Replace hardcoded tool check with generic detection + AlphaToolRenderer

Replace the tool rendering block (lines 85-114):

```tsx
// Before (hardcoded):
if (part.type === 'tool-displayTransactionsTool') {
  if (part.state === 'output-available') {
    const output = part.output as { message: string };
    return <TransactionsToSign key={index} message={output.message} />;
  }
  // ...loading states
}

// After (generic):
if (part.type.startsWith('tool-')) {
  return (
    <AlphaToolRenderer
      key={index}
      state={(part as { state: string }).state}
      output={'output' in part ? (part as { output: unknown }).output : undefined}
    />
  );
}
```

Full updated imports at top of file — remove `TransactionsToSign` and `Loader2`, add `AlphaToolRenderer`:

```tsx
import { AlphaToolRenderer } from './alpha-tool-renderer';
```

(Keep `Loader2` import only if used elsewhere in the file — it's not, so remove it.)

### Success Criteria:

#### Automated Verification:
- [ ] `cd packages/web && npx tsc --noEmit` compiles
- [ ] `cd packages/web && pnpm build` succeeds

#### Manual Verification:
- [ ] Navigate to `/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/ask-ai`
- [ ] Type "show transactions" → agent calls tool → `TransactionsToSign` placeholder card renders
- [ ] Type "hello" → agent responds with text only, rendered normally
- [ ] In Mastra Studio: same prompt shows JSON with `type: "transactions-to-sign"` field

**Implementation Note**: After completing this phase and all verification passes, pause for manual testing.

---

## Phase 4: Browser Testing

### Test Steps:

1. Start Mastra dev server: `cd packages/mastra && pnpm dev`
2. Start web app: `cd packages/web && pnpm dev`
3. **Mastra Studio** (localhost:4111):
   - Navigate to alpha agent chat
   - Send "display alpha transactions to sign"
   - Verify JSON response contains `type: "transactions-to-sign"` discriminator
4. **Web app** (localhost:3000):
   - Navigate to `/vaults/1/0xB0f56BB0bf13ee05FeF8cD2d8DF5FfdFcAC7a74f/ask-ai`
   - Send "display alpha transactions to sign"
   - Verify `TransactionsToSign` placeholder card renders
   - Send "hello" — verify normal text response
5. **chatRoute API**:
   - `curl` to `http://localhost:4111/chat/alphaAgent` — verify streaming response

### Success Criteria:

#### Manual Verification:
- [ ] Studio: JSON output has `type` discriminator field visible
- [ ] Web app: Custom placeholder card renders for tool output
- [ ] Web app: Text messages render normally
- [ ] chatRoute: API endpoint responds with AI SDK-compatible stream
- [ ] No console errors in either environment

---

## Testing Strategy

### Unit Tests:
- None needed — this is a type system + rendering refactor with no business logic

### Manual Testing Steps:
1. Verify discriminated type in Studio JSON
2. Verify custom component rendering in web app
3. Verify chatRoute endpoint works
4. Verify fallback (unknown type) renders as JSON

## Performance Considerations

- No performance impact — `chatRoute()` adds one API route to the Mastra server
- The generic renderer adds one `startsWith('tool-')` check per message part, negligible
- `switch` on `output.type` is O(1)

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0033-testing-alpha-agent-in-studio.md`
- Alpha agent plan: `thoughts/shared/plans/2026-02-13-FSN-0031-alpha-agent.md`
- Mastra chatRoute docs: `reference/ai-sdk/chat-route`
- Mastra Custom UI docs: `guides/build-your-ui/ai-sdk-ui` (Custom UI section)
- Current tool: `packages/mastra/src/tools/alpha/display-transactions.ts`
- Current renderer: `packages/web/src/vault-details/components/vault-ask-ai.tsx:85-114`
- Current component: `packages/web/src/vault-details/components/transactions-to-sign.tsx`
