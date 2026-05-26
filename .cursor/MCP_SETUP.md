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
