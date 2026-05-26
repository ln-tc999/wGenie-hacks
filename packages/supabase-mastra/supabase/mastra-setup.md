# Mastra Database Setup Guide

This guide explains how to set up a **Supabase database** for Mastra's internal data.

## Why a Separate Database for Mastra?

Mastra stores its own data that is independent of your application:

| Mastra Database | App Database |
|-----------------|--------------|
| Agent memory | Vault data |
| Thread history | Transaction logs |
| Workflow state | User data |
| Observability traces | Analytics |
| Internal caching | Configuration |

Keeping them separate provides:
- **Clean separation of concerns** - Mastra data vs. application content
- **Independent scaling** - Scale each database based on needs
- **Easier debugging** - Clear boundary between AI infrastructure and content
- **Simpler migrations** - Update Mastra without affecting app data

---

## Step 1: Create a New Supabase Project for Mastra

### Go to Supabase Dashboard

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**

### Project Settings

| Setting | Recommended Value | Why |
|---------|-------------------|-----|
| **Project Name** | `fusion-mastra` | Clearly identifies this as Mastra storage |
| **Database Password** | Generate a strong one | **⚠️ Save this for MASTRA_DATABASE_URL** |
| **Region** | Same as your app database | Lower latency between services |
| **Pricing Plan** | Free tier is fine | Mastra data is lightweight |

### Click "Create new project"

Wait 1-2 minutes for provisioning.

---

## Step 2: Get Your Mastra Database URL

Once the project is ready:

1. Go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **"Transaction"** pooler mode (port 6543)
4. Copy the connection string
5. **Replace `[YOUR-PASSWORD]`** with the database password from Step 1

Example format:
```
postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## Step 3: Add to Your .env File

Add the Mastra database URL to your `.env` file:

```env
# =============================================================================
# MASTRA DATABASE
# =============================================================================
# PostgreSQL Connection String for Mastra's internal storage
# Get from: Mastra Supabase project → Settings → Database → Connection string

MASTRA_DATABASE_URL=postgresql://postgres.mastra-xxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## Step 4: Mastra Auto-Migration

**You don't need to manually create tables!**

Mastra's `@mastra/pg` PostgresStore automatically creates its required tables on first run:
- `mastra_threads` - Conversation threads
- `mastra_messages` - Message history
- `mastra_memory` - Agent memory
- `mastra_kv` - Key-value store
- And other internal tables

Just run your Mastra application and the tables will be created automatically.

---

## Step 5: Verify Configuration

Test the connection:

```bash
cd packages/supabase-mastra
pnpm test:connection
```

---

## Environment Variables Summary

| Variable | Purpose |
|----------|---------|
| `MASTRA_DATABASE_URL` | Mastra internal storage (memory, threads, workflows) |

---

## Troubleshooting

### "Missing Mastra database connection string"
- Make sure `MASTRA_DATABASE_URL` is set in `.env`
- Verify it points to your Mastra Supabase project

### "could not connect to server"
- Check the database password is correct
- Verify the connection string uses Transaction pooler mode (port 6543)

### Mastra tables not created
- The tables are created on first use
- Run `pnpm run dev` to start Mastra and trigger table creation

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Fusion Monorepo                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │     Mastra Agents    │    │      Application Logic       │   │
│  │  (AI, Memory, Tools) │    │  (Vaults, Analytics, etc.)   │   │
│  └──────────┬───────────┘    └─────────────┬────────────────┘   │
│             │                              │                     │
│             ▼                              ▼                     │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │  MASTRA_DATABASE_URL │    │  Other Database Connections  │   │
│  │  (@mastra/pg)        │    │  (@supabase/supabase-js)     │   │
│  └──────────┬───────────┘    └─────────────┬────────────────┘   │
│             │                              │                     │
└─────────────┼──────────────────────────────┼─────────────────────┘
              │                              │
              ▼                              ▼
    ┌─────────────────┐           ┌─────────────────┐
    │   Supabase      │           │   Supabase      │
    │   MASTRA DB     │           │     APP DB      │
    │                 │           │                 │
    │ • mastra_*      │           │ • app tables    │
    │   tables        │           │ • vault data    │
    │ • Agent memory  │           │ • analytics     │
    │ • Threads       │           │                 │
    │ • Workflows     │           │                 │
    └─────────────────┘           └─────────────────┘
```

---

## Quick Start Checklist

- [ ] Create new Supabase project for Mastra
- [ ] Get connection string (Transaction pooler mode)
- [ ] Add `MASTRA_DATABASE_URL` to `.env`
- [ ] Run application to auto-create Mastra tables
- [ ] Verify connection with `pnpm test:connection`
