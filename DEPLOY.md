# Deployment Guide

## Arsitektur

```
Vercel (Next.js - Frontend)
│
│  /api/cfo/treasury/chat → call LLM NVIDIA, terus
│   kirim request ke Railway buat execute tools
│
└──▶ Railway (Backend Services)
     │
     ├── PostgreSQL         (Railway built-in, gratis)
     ├── Ponder Indexer     (blockchain indexer)
     └── Tool Executor      (API kecil buat jalanin byreal-cli)
```

Kenapa pisah? **Byreal CLI** pake `execSync` yang **gak bisa jalan di Vercel** (serverless).

---

## Step-by-step

### 1. Deploy ke Vercel

- Hubungin GitHub repo ke Vercel
- Root directory: `packages/web`
- Build command: `pnpm build`
- Output: `packages/web/.next`
- Framework: Next.js

Environment variables di Vercel (`packages/web/.env.local`):

```
NEXT_PUBLIC_NVIDIA_API_KEY=...
NEXT_PUBLIC_DEFAULT_CHAIN_ID=5003
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_TREASURY_ADDRESS=0x3c13BDd505DE69bB0DF0a2e68A0Cd93a44beB0b4
NEXT_PUBLIC_CFO_TOOL_EXECUTOR_URL=https://<railway-app>.up.railway.app
```

> `CFO_TOOL_EXECUTOR_URL` → diisi setelah Railway jalan.

---

### 2. Setup Railway

Bikin project baru di [railway.app](https://railway.app), terus tambah 3 service:

#### a. PostgreSQL

- Klik "New" → Database → PostgreSQL
- Nanti dapet connection string: `postgresql://postgres:...@...railway.app:6542/railway`
- Simpen, dipake buat Ponder

#### b. Ponder Indexer

Monorepo → tambah service baru → source: GitHub repo → pilih `packages/ponder`

Build:
```
root directory: packages/ponder
start command: npx ponder start  # (scripts udah ada pnpm start)
```

Environment variables:

```
PONDER_DATABASE_URL=<postgresql connection string dari Railway PostgreSQL>
PONDER_RPC_URL_MANTLE=https://rpc.mantle.xyz
PONDER_RPC_URL_MANTLE_SEPOLIA=https://rpc.sepolia.mantle.xyz
DATABASE_SCHEMA=public
```

#### c. Tool Executor

Buat service baru di Railway → pilih **Blank** atau **Raw Dockerfile**.

Di root repo, buat file `railway-executor/package.json`:

```json
{
  "name": "tool-executor",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  }
}
```

Buat `railway-executor/index.js`:

```javascript
import http from 'node:http';
import { execSync } from 'node:child_process';

const server = http.createServer((req, res) => {
  // CORS buat Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { tool, args } = JSON.parse(body);

      if (tool.startsWith('byreal:')) {
        const cmd = tool.replace('byreal:', '');
        const argString = args ? ' ' + args.join(' ') : '';
        const output = execSync(`byreal-cli ${cmd}${argString}`, {
          encoding: 'utf-8',
          timeout: 15000
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, output: output.trim() }));
      } else if (tool === 'readWalletGenieTreasury') {
        const { address, chainId } = args;
        const output = execSync(
          `~/.foundry/bin/forge call ${address} "getBalance()(uint256)" --rpc-url ${getRpcUrl(chainId)}`,
          { encoding: 'utf-8', timeout: 10000 }
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, output: output.trim() }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Unknown tool' }));
      }
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

function getRpcUrl(chainId) {
  if (chainId === 5000) return process.env.PONDER_RPC_URL_MANTLE;
  return process.env.PONDER_RPC_URL_MANTLE_SEPOLIA;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Tool executor running on port ${PORT}`));
```

> **Atau** kalo Railway support npx: start command bisa `node railway-executor/index.js`

Buat `railway-executor/Dockerfile` (optional, kalo pake Raw Dockerfile):

```dockerfile
FROM node:22-slim

# Install byreal-cli dan foundry
RUN npm install -g @byreal-io/byreal-cli@0.3.6

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

WORKDIR /app
COPY package.json index.js ./
ENV PATH="/root/.foundry/bin:${PATH}"

EXPOSE 3001
CMD ["node", "index.js"]
```

Environment variables Railway (Tool Executor):

```
PONDER_RPC_URL_MANTLE=https://rpc.mantle.xyz
PONDER_RPC_URL_MANTLE_SEPOLIA=https://rpc.sepolia.mantle.xyz
```

---

### 3. Update CFO Agent

Di `packages/web/src/app/api/cfo/treasury/chat/route.ts`, ganti semua `execSync` jadi `fetch` ke tool executor:

```typescript
const EXECUTOR_URL = process.env.NEXT_PUBLIC_CFO_TOOL_EXECUTOR_URL;

async function callToolExecutor(tool: string, args: any) {
  const res = await fetch(`${EXECUTOR_URL}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args }),
  });
  return res.json();
}
```

---

### 4. Domain & Final Setup

Beres semua:

| Service | URL |
|---------|-----|
| **Web (Vercel)** | `https://web.vercel.app` |
| **Tool Executor (Railway)** | `https://tool-executor.up.railway.app` |
| **Ponder indexer** | Bareng di Railway, akses internal |

Set `NEXT_PUBLIC_CFO_TOOL_EXECUTOR_URL=https://tool-executor.up.railway.app` di Vercel environment variables.

Selesai! 🎉
