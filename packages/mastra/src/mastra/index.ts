import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { VercelDeployer } from '@mastra/deployer-vercel';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { chatRoute } from '@mastra/ai-sdk';
import { createMiddleware } from 'hono/factory';
import { alphaAgent } from '../agents/alpha-agent';
import { yoTreasuryAgent } from '../agents/yo-treasury-agent';
import { createStorage } from '../storage';

const apiKeyMiddleware = createMiddleware(async (c, next) => {
  if (c.req.path === '/health') {
    return next();
  }

  const apiKey = c.req.header('X-API-Key');
  if (!apiKey || apiKey !== process.env.MASTRA_API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
});

export const mastra = new Mastra({
  agents: { alphaAgent, yoTreasuryAgent },
  deployer: new VercelDeployer({
    regions: ['fra1'],
    maxDuration: 60,
  }),
  storage: createStorage('mastra-storage'),
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
    middleware: [apiKeyMiddleware],
    cors: {
      origin: 'https://fusion-monorepo-web.vercel.app',
      allowMethods: ['*'],
      allowHeaders: ['Content-Type', 'X-API-Key'],
    },
    apiRoutes: [
      chatRoute({
        path: '/chat/:agentId',
      }),
    ],
  },
});
