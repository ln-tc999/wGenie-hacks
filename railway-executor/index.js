import http from 'node:http';
import { execSync } from 'node:child_process';

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // Health check endpoint for Railway
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Tool Executor is running' }));
    return;
  }

  // Execution endpoint
  if (req.method === 'POST') {
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
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unknown tool' }));
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function getRpcUrl(chainId) {
  if (chainId === 5000) return process.env.PONDER_RPC_URL_MANTLE || 'https://rpc.mantle.xyz';
  return process.env.PONDER_RPC_URL_MANTLE_SEPOLIA || 'https://rpc.sepolia.mantle.xyz';
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Tool executor running on port ${PORT}`));
