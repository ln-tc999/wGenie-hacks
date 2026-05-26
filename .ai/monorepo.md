
# Monorepo Structure

This document outlines monorepo plan for the Fusion Monorepo, a TypeScript-based blockchain analytics and AI-powered application.

```
fusion-monorepo/
├── package.json                    # Root workspace configuration
├── tsconfig.base.json              # Shared TypeScript config
├── .env.example                    # Environment variables template
├── packages/
│   ├── ponder/                     # Blockchain indexer
│   ├── mastra/                     # AI agent framework
│   ├── supabase-ponder/            # Supabase for Ponder data
│   ├── supabase-mastra/            # Supabase for mastra data
│   ├── fusion-sdk/                 # TypeScript SDK for smart contracts
│   ├── web/                        # Astro frontend
│   └── hardhat-tests/              # Integration tests (optional)
└── .ai/                            # AI documentation
```

## Package Specifications

### packages/ponder - Blockchain Indexer

Index Plasma Vault events from multiple chains into PostgreSQL.

### packages/mastra - AI Agent Framework

Provide AI-powered data analysis and natural language interface to Fusion data.

I want to use Mastra to provide Agent UI that has access to all data sources: ponder events data, smart contracts data via fusion sdk, app data. Agent shows data in breakdowns, tables, charts.

Prompt Claude Code and Cursor with Mastra MCP server.

Excellent DX. I prompt cursor to visit local development app in their internal browser. Agent driven development. When something going wrong in the mastra agent chat then I can ask cursor to read the web app chat view and identify issues with the chat context. In admin app I’m connected to frontend by Refine Core hooks that contains queries. I can prompt cursor or Claude Code to implement new features using natural language with refine hooks for Supabase.

### packages/supabase-ponder - Ponder Database

PostgreSQL database for Ponder indexed data (separate from app data).

### packages/supabase-app - Application Database

Store application-specific data (user preferences, saved queries, etc.).

### packages/sdk - Fusion TypeScript SDK

TypeScript interface for dealing with Fusion smart contracts seamlesslly. Human and agent friendly interface.

### packages/web - Astro Frontend

User-facing web application with React islands for interactive components.
It displays valuable information about vaults performance and activity.

### packages/hardhat-tests - Integration Tests

Test SDK against live production contracts at fixed block numbers.

Hardhat tests the code that needs access to the live production smart contracts fixed for one block number per test. Integration tests between the blockchain, sdk and other potential functions.