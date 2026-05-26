# Refactor Mastra Package to v1 - Implementation Plan

## Overview

The Mastra package (`packages/mastra`) has all dependencies at v1.2.0 but the code was written for v0 and contains outdated patterns, deprecated API usage, and type errors. This plan refactors all code to use proper v1 APIs and removes the example starter files.

## Current State Analysis

**Dependencies**: Already on v1.2.0 - no package updates needed.

**TypeScript errors** (`npx tsc --noEmit`): 14 errors across 7 files:

| Error Category | Count | Files |
|---|---|---|
| Agent missing `id` field | 2 | `sql-agent.ts`, `plasma-vault-agent.ts` |
| `runtimeContext` → `requestContext` | 3 | `database-query-workflow.ts` |
| Tool `execute()` wrong signature (v0 calling convention) | 3 | `database-query-workflow.ts` |
| Viem `PublicClient` type mismatch (TS version conflict) | 4 | `check-role.ts`, `get-vault-fees.ts`, `get-vault-fuses.ts`, `get-vault-info.ts` |
| Missing `@types/pg` | 2 | `database-introspection-tool.ts`, `sql-execution-tool.ts` |
| Implicit `any` on `table` param | 1 | `database-introspection-tool.ts` |

### Key Discoveries:

- v1 `AgentConfig` requires `id` field - `sql-agent.ts:17` and `plasma-vault-agent.ts:28` are missing it
- v1 workflow step `ExecuteFunctionParams` uses `requestContext` not `runtimeContext` - `database-query-workflow.ts:16,72,162`
- v1 tool `execute()` signature is `(inputData, context?)` - workflow calls tools with v0 `({ context, runtimeContext })` at lines 24, 102, 197
- Viem type errors caused by multiple TypeScript versions in the monorepo (5.7.3 vs 5.8.3) - needs `as any` cast or catalog alignment
- Example weather files (`src/mastra/agents/`, `src/mastra/tools/`, `src/mastra/workflows/`, `src/mastra/scorers/`) are starter templates not needed

## Desired End State

- Zero TypeScript errors: `npx tsc --noEmit` passes cleanly
- All code uses v1 patterns (no v0 remnants)
- Example/starter files removed
- `mastra dev` starts successfully
- All agents respond correctly in Mastra Studio

## What We're NOT Doing

- Not upgrading package versions (already on v1.2.0)
- Not changing business logic of agents or tools
- Not adding new features or agents
- Not changing the agent instructions/prompts
- Not refactoring the tool implementations (they work correctly)
- Not running database migrations (no storage schema changes needed)

## Implementation Approach

Three phases: (1) Remove dead code, (2) Fix all v1 API issues, (3) Verify everything works.

---

## Phase 1: Remove Example Files and Clean Up Mastra Index

### Overview

Remove the weather example files that came with the Mastra starter template and clean up the main Mastra index to only register our custom agents and workflows.

### Changes Required:

#### 1. Delete example files

**Delete** the following files:
- `src/mastra/agents/weather-agent.ts`
- `src/mastra/tools/weather-tool.ts`
- `src/mastra/workflows/weather-workflow.ts`
- `src/mastra/scorers/weather-scorer.ts`

#### 2. Update Mastra index

**File**: `src/mastra/index.ts`

Remove imports for weather agent, weather workflow, and weather scorers. Remove them from the Mastra configuration. Keep only our custom agents and workflows.

```typescript
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { sqlAgent } from '../agents/sql-agent';
import { plasmaVaultAgent } from '../agents/plasma-vault-agent';
import { databaseQueryWorkflow } from '../workflows/database-query-workflow';

export const mastra = new Mastra({
  workflows: { databaseQueryWorkflow },
  agents: { sqlAgent, plasmaVaultAgent },
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
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Deleted files no longer exist: `ls src/mastra/agents/ src/mastra/tools/ src/mastra/workflows/ src/mastra/scorers/` shows empty or no directories
- [ ] No import references to deleted files: `grep -r "weather-agent\|weather-tool\|weather-workflow\|weather-scorer" src/`
- [ ] No references to `scorers` config key in Mastra index

---

## Phase 2: Fix All v1 API Issues

### Overview

Fix all TypeScript errors by updating code to use v1 API patterns: add `id` to agents, fix `runtimeContext` → `requestContext`, fix tool calling convention in workflows, add `@types/pg`, and fix viem type issues.

### Changes Required:

#### 1. Add `id` field to agents

**File**: `src/agents/sql-agent.ts`

Add `id` property to the Agent constructor:

```typescript
export const sqlAgent = new Agent({
  id: 'sql-agent',
  name: 'SQL Agent',
  // ... rest unchanged
});
```

**File**: `src/agents/plasma-vault-agent.ts`

Add `id` property to the Agent constructor:

```typescript
export const plasmaVaultAgent = new Agent({
  id: 'plasma-vault-agent',
  name: 'Plasma Vault Agent',
  // ... rest unchanged
});
```

#### 2. Refactor database-query-workflow to v1 patterns

**File**: `src/workflows/database-query-workflow.ts`

This is the biggest change. The workflow currently manually calls `tool.execute()` with v0 convention inside custom steps. We'll refactor to:

1. Use `createStep(tool)` for the introspection and execution tools (compose tools as steps)
2. Keep custom steps only where we need suspend/resume or custom logic
3. Replace all `runtimeContext` with `requestContext`
4. Fix tool calling convention: `tool.execute(inputData, { requestContext })` instead of `tool.execute({ context: inputData, runtimeContext })`

The workflow structure changes from:
- Step 1: Custom step that manually calls `databaseIntrospectionTool.execute()`
- Step 2: Custom step with suspend that manually calls `sqlGenerationTool.execute()`
- Step 3: Custom step with suspend that manually calls `sqlExecutionTool.execute()`

To:
- Step 1: Custom step that calls `databaseIntrospectionTool.execute({}, { requestContext })` and creates schema presentation
- Step 2: Custom step with suspend that calls `sqlGenerationTool.execute({ naturalLanguageQuery, databaseSchema: schema }, { requestContext })`
- Step 3: Custom step with suspend that calls `sqlExecutionTool.execute({ query: finalSQL }, { requestContext })`

Note: We keep custom steps (not `createStep(tool)`) because:
- Step 1 needs to post-process the tool output (create schema presentation)
- Step 2 needs suspend/resume for getting the natural language query
- Step 3 needs suspend/resume for approval

The key changes in each step's execute function:

```typescript
// Step 1: Fix runtimeContext and tool calling
execute: async ({ requestContext }) => {
  const schemaData = await databaseIntrospectionTool.execute(
    {},
    { requestContext },
  );
  // ...
}

// Step 2: Fix runtimeContext and tool calling
execute: async ({ inputData, resumeData, suspend, requestContext }) => {
  // ...
  const generatedSQL = await sqlGenerationTool.execute(
    { naturalLanguageQuery, databaseSchema: schema },
    { requestContext },
  );
  // ...
}

// Step 3: Fix runtimeContext and tool calling
execute: async ({ inputData, resumeData, suspend, requestContext }) => {
  // ...
  const result = await sqlExecutionTool.execute(
    { query: finalSQL },
    { requestContext },
  );
  // ...
}
```

Also remove the `RequestContext` import from `@mastra/core/di` - it's no longer needed since we use the `requestContext` from the step params directly instead of creating `new RequestContext()`.

#### 3. Install @types/pg

Run: `pnpm add -D @types/pg` in `packages/mastra`

This fixes:
- `src/tools/database-introspection-tool.ts:3` - missing type declarations for `pg`
- `src/tools/sql-execution-tool.ts:3` - missing type declarations for `pg`

#### 4. Fix implicit `any` type

**File**: `src/tools/database-introspection-tool.ts`

At line 120, the `table` parameter in the `.map()` callback needs a type annotation:

```typescript
const rowCountsPromises = tables.map(async (table: { schema_name: string; table_name: string }) => {
```

#### 5. Fix viem PublicClient type mismatch

The viem type errors are caused by multiple TypeScript versions in the monorepo (5.7.3 vs 5.8.3), which creates incompatible type instantiations. The `PlasmaVault.create()` call receives a `PublicClient` typed with one TS version but fusion-sdk expects one typed with another.

**File**: `src/tools/plasma-vault/get-vault-info.ts` - already works at runtime, needs type assertion:

```typescript
const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);
```

**File**: `src/tools/plasma-vault/get-vault-fuses.ts` - same fix:

```typescript
const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);
```

**File**: `src/tools/plasma-vault/get-vault-fees.ts` - same fix:

```typescript
const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);
```

**File**: `src/tools/plasma-vault/check-role.ts` - same fix:

```typescript
const vault = await PlasmaVault.create(publicClient as any, vaultAddress as Address);
```

Note: `get-vault-tvl.ts` already has `as any` cast at line 51. The other 4 files need the same treatment.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript passes with zero errors: `npx tsc --noEmit`
- [ ] No references to `runtimeContext` in source: `grep -r "runtimeContext" src/`
- [ ] All agents have `id` property: `grep -A1 "new Agent" src/agents/`

---

## Phase 3: Verify Everything Works

### Overview

Run `mastra dev` to start Mastra Studio and verify agents are registered and accessible.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npx tsc --noEmit` passes
- [ ] `mastra dev` starts without errors (starts the dev server)

#### Manual Verification:
- [ ] Mastra Studio opens at http://localhost:4111
- [ ] SQL Agent appears in the agents list
- [ ] Plasma Vault Agent appears in the agents list
- [ ] Weather Agent is NOT listed (removed)
- [ ] Database Query Workflow appears in workflows list

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Automated Tests:
- TypeScript type-check: `npx tsc --noEmit` (primary verification)
- No existing test suite to run (tests are stubbed out in package.json)

### Manual Testing Steps:
1. Run `mastra dev` in `packages/mastra`
2. Open Mastra Studio at http://localhost:4111
3. Verify SQL Agent and Plasma Vault Agent are listed
4. Verify Weather Agent is NOT listed
5. Verify Database Query Workflow is listed
6. (Optional) Test an agent chat to verify it still works

## Performance Considerations

No performance impact - this is a code quality refactor only.

## Migration Notes

No data migration needed. The SQLite databases (mastra.db) don't need schema changes since the storage package versions aren't changing.

## References

- Original ticket: `thoughts/kuba/tickets/fsn_0010-refactor-mastra-to-v1.md`
- Mastra v1 migration guide: https://mastra.ai/guides/migrations/upgrade-to-v1/overview
- Embedded v1 docs: `node_modules/@mastra/core/dist/docs/`
- v1 Tool execute signature: `execute?: (inputData: TSchemaIn, context: TContext) => Promise<TSchemaOut>` from `dist/tools/types.d.ts`
- v1 Step execute signature: `ExecuteFunction<...> = (params: ExecuteFunctionParams<...>) => Promise<TStepOutput>` from `dist/workflows/step.d.ts`
- v1 AgentConfig requires `id: string` field from `dist/agent/types.d.ts`
