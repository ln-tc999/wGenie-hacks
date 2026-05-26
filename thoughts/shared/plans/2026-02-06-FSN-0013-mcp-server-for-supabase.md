# Supabase MCP Server for Claude Code and Cursor — Implementation Plan

## Overview

Configure the official Supabase MCP server (HTTP transport, `http://127.0.0.1:54341/mcp`) for both Claude Code and Cursor IDE, connecting to the local Ponder Supabase instance. Fix stale documentation.

## Current State Analysis

- **Cursor** (`.cursor/mcp.json:10-12`): Already has `supabase-ponder-db` configured at `http://127.0.0.1:54341/mcp` — correct
- **Claude Code** (`.mcp.json`): Only has `playwright` and `shadcn` — missing Supabase
- **Claude Code settings** (`.claude/settings.local.json`): Has `enableAllProjectMcpServers: true` and explicitly enables `playwright` and `shadcn` in `enabledMcpjsonServers`
- **Local Supabase** (`packages/supabase-ponder/supabase/config.toml:10`): API on port **54341**
- **MCP_SETUP.md** (`.cursor/MCP_SETUP.md:31-33`): References stale ports 54331/54332/54333 — should be 54341/54342/54343

### Key Discoveries:

- Official Supabase MCP uses HTTP transport: just a `"url"` field pointing to `<supabase-api>/mcp`
- No npm package or stdio server needed — the local Supabase CLI exposes `/mcp` endpoint natively
- The `read_only=true` query parameter is available for safety but optional for local dev

## Desired End State

After this plan is complete:

1. Claude Code has access to the Supabase MCP server and its tools (SQL queries, schema inspection, etc.)
2. Cursor continues to have access (already working)
3. Documentation accurately reflects the setup for both tools
4. All port references are correct (54341/54342/54343)

### Verification:
- Start local Supabase with `pnpm db:start`
- In Claude Code, run `/mcp` to verify `supabase` server is connected and tools are available
- In Cursor, verify MCP server status in Settings > Tools & MCP

## What We're NOT Doing

- Not connecting to a remote/cloud Supabase instance
- Not using the `npx @supabase/mcp-server-supabase` stdio transport
- Not configuring the Mastra Supabase instance (separate concern)
- Not adding authentication/OAuth (local instance doesn't need it)

## Implementation Approach

Simple config file updates — add the HTTP MCP server URL to Claude Code's `.mcp.json`, enable it in settings, and fix stale docs.

## Phase 1: Add Supabase MCP to Claude Code

### Overview

Add the Supabase MCP server entry to `.mcp.json` and enable it in Claude Code settings.

### Changes Required:

#### 1. Update `.mcp.json`

**File**: `.mcp.json`
**Changes**: Add `supabase` server entry using HTTP transport

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    },
    "supabase": {
      "url": "http://127.0.0.1:54341/mcp"
    }
  }
}
```

#### 2. Update `.claude/settings.local.json`

**File**: `.claude/settings.local.json`
**Changes**: Add `"supabase"` to `enabledMcpjsonServers` array

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm db:start:*)",
      "mcp__playwright__browser_navigate",
      "Bash(pnpm dev:mastra:*)",
      "WebFetch(domain:mastra.ai)",
      "Bash(grep:*)",
      "Bash(npx tsc:*)",
      "mcp__playwright__browser_wait_for",
      "mcp__playwright__browser_click",
      "mcp__playwright__browser_type",
      "mcp__playwright__browser_snapshot",
      "Bash(test:*)",
      "mcp__playwright__browser_console_messages",
      "mcp__playwright__browser_network_requests",
      "mcp__playwright__browser_take_screenshot",
      "Bash(pnpm --filter web typecheck:*)",
      "mcp__playwright__browser_close",
      "WebSearch",
      "WebFetch(domain:supabase.com)",
      "WebFetch(domain:github.com)",
      "WebFetch(domain:www.npmjs.com)"
    ]
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": [
    "playwright",
    "shadcn",
    "supabase"
  ]
}
```

### Success Criteria:

#### Automated Verification:

- [ ] `.mcp.json` is valid JSON: `cat .mcp.json | python3 -m json.tool`
- [ ] `.claude/settings.local.json` is valid JSON: `cat .claude/settings.local.json | python3 -m json.tool`

#### Manual Verification:

- [ ] Start local Supabase: `pnpm db:start`
- [ ] Restart Claude Code session
- [ ] Run `/mcp` in Claude Code — `supabase` server should appear as connected
- [ ] Supabase tools (e.g. SQL query, list tables) should be available

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Fix Cursor Config and Stale Documentation

### Overview

Update `MCP_SETUP.md` to reflect correct ports and cover both Claude Code and Cursor setup.

### Changes Required:

#### 1. Rewrite `.cursor/MCP_SETUP.md`

**File**: `.cursor/MCP_SETUP.md`
**Changes**: Fix stale port references, add Claude Code instructions, update to reflect official Supabase MCP

```markdown
# MCP Server Configuration

## Supabase Ponder Database (MCP)

Both Claude Code and Cursor connect to the local Supabase Ponder instance via the official Supabase MCP endpoint.

**Endpoint**: `http://127.0.0.1:54341/mcp`

Reference: https://supabase.com/docs/guides/getting-started/mcp

### Prerequisites

Start the local Supabase instance:

```bash
pnpm db:start
```

This starts:
- **Port 54341** — Supabase API (REST + MCP endpoint)
- **Port 54342** — PostgreSQL database (used by Ponder)
- **Port 54343** — Supabase Studio (database browser)

### Claude Code

Configured in `.mcp.json` (project root):

```json
{
  "mcpServers": {
    "supabase": {
      "url": "http://127.0.0.1:54341/mcp"
    }
  }
}
```

Verify: restart Claude Code, then run `/mcp` to check server status.

### Cursor

Configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase-ponder-db": {
      "url": "http://127.0.0.1:54341/mcp"
    }
  }
}
```

Verify: restart Cursor, then go to **Settings > Tools & MCP** to check server status.

## Other MCP Servers

- **Mastra** (Cursor only) — Mastra AI documentation server
- **Playwright** (Claude Code) — Browser automation
- **shadcn** (Claude Code) — UI component registry
```

### Success Criteria:

#### Automated Verification:

- [ ] No stale port references remain: `grep -r "5433[0-9]" .cursor/MCP_SETUP.md` returns nothing

#### Manual Verification:

- [ ] Documentation accurately describes the setup
- [ ] Port numbers match `packages/supabase-ponder/supabase/config.toml`

---

## References

- Ticket: `thoughts/kuba/tickets/fsn_0013-mcp-server-for-supabase.md`
- Official Supabase MCP docs: https://supabase.com/docs/guides/getting-started/mcp
- Supabase config: `packages/supabase-ponder/supabase/config.toml`
- Claude Code MCP docs: https://code.claude.com/docs/en/mcp
