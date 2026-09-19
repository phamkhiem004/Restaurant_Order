/// <reference types="@cloudflare/workers-types" />

import { httpServerHandler } from 'cloudflare:node';

type NodeHttpHandler = ReturnType<typeof httpServerHandler>;

interface WorkerEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  VNP_TMN_CODE?: string;
  VNP_HASH_SECRET?: string;
  VNP_URL?: string;
  VNP_RETURN_URL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  REALTIMEKIT_APP_ID?: string;
  REALTIMEKIT_API_TOKEN?: string;
  REALTIMEKIT_DEMO_KEY?: string;
  REALTIMEKIT_GUEST_PRESET?: string;
  REALTIMEKIT_HOST_PRESET?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  NODE_ENV?: string;
}

function copyBindingToProcessEnv(env: WorkerEnv): void {
  const variableNames = [
    'VNP_TMN_CODE',
    'VNP_HASH_SECRET',
    'VNP_URL',
    'VNP_RETURN_URL',
    'CLOUDFLARE_ACCOUNT_ID',
    'REALTIMEKIT_APP_ID',
    'REALTIMEKIT_API_TOKEN',
    'REALTIMEKIT_DEMO_KEY',
    'REALTIMEKIT_GUEST_PRESET',
    'REALTIMEKIT_HOST_PRESET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'NODE_ENV',
  ] as const;

  for (const name of variableNames) {
    const value = env[name];
    if (value !== undefined) {
      (process.env as Record<string, string | undefined>)[name] = value;
    }
  }
}

let nestHandlerPromise: Promise<NodeHttpHandler> | undefined;

async function createNestHandler(env: WorkerEnv): Promise<NodeHttpHandler> {
  copyBindingToProcessEnv(env);

  const { createNestApp } = await import('./bootstrap.js');
  const app = await createNestApp(env.DB);
  await app.init();

  const server = app.getHttpServer() as Parameters<typeof httpServerHandler>[0];
  return httpServerHandler(server);
}

async function getNestHandler(env: WorkerEnv): Promise<NodeHttpHandler> {
  nestHandlerPromise ??= createNestHandler(env).catch((error) => {
    nestHandlerPromise = undefined;
    throw error;
  });
  return nestHandlerPromise;
}

async function handleNestRequest(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  const handler = await getNestHandler(env);

  if (!handler.fetch) {
    throw new Error('Cloudflare Node HTTP handler does not expose fetch().');
  }

  return handler.fetch(
    request as Parameters<NonNullable<typeof handler.fetch>>[0],
    env,
    ctx,
  );
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    // Verify a deployed Worker without first requiring a database connection.
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', runtime: 'cloudflare-workers' });
    }

    // Public, secret-free helper for monitoring workflows. RedAI's schedule
    // trigger does not expose its execution timestamp, so the workflow uses
    // this endpoint to build an exact rolling analytics window.
    if (url.pathname === '/monitoring/window' && request.method === 'GET') {
      const end = new Date();
      const start = new Date(end.getTime() - 3 * 60 * 1000);

      const query = `query {
        viewer {
          zones(filter: { zoneTag: "3d3d6f1f464895ebf6cd6764284e9825" }) {
            total: httpRequestsAdaptiveGroups(
              limit: 1
              filter: { datetime_geq: "${start.toISOString()}", datetime_leq: "${end.toISOString()}" }
            ) { count }
            errors500: httpRequestsAdaptiveGroups(
              limit: 1
              filter: {
                datetime_geq: "${start.toISOString()}"
                datetime_leq: "${end.toISOString()}"
                edgeResponseStatus: 500
              }
            ) { count }
          }
        }
      }`;

      return Response.json(
        { query },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (
      url.pathname === '/monitoring/error-rate' &&
      request.method === 'POST'
    ) {
      const payload = (await request.json()) as {
        total?: unknown;
        error500?: unknown;
      };
      const total = Number(payload.total);
      const error500 = Number(payload.error500);

      if (!Number.isFinite(total) || !Number.isFinite(error500) || total <= 0) {
        return Response.json(
          { error: 'total and error500 must be finite numbers; total must be > 0' },
          { status: 400 },
        );
      }

      return Response.json(
        { result: (error500 / total) * 100, total, error500 },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Receives the complete HTTP-node response from Cloudflare GraphQL.
    // A non-alert is deliberately returned on a non-2xx port so the workflow
    // can gate the Telegram node without a separate Condition node.
    if (url.pathname === '/monitoring/evaluate' && request.method === 'POST') {
      const payload = (await request.json()) as {
        body?: {
          data?: {
            viewer?: {
              zones?: Array<{
                total?: Array<{ count?: unknown }>;
                errors500?: Array<{ count?: unknown }>;
              }>;
            };
          };
        };
      };
      const zone = payload.body?.data?.viewer?.zones?.[0];
      const total = Number(zone?.total?.[0]?.count ?? 0);
      const error500 = Number(zone?.errors500?.[0]?.count ?? 0);
      const errorRate = total > 0 ? (error500 / total) * 100 : 0;

      if (errorRate <= 3) {
        return Response.json(
          { alert: false, errorRate, total, error500, threshold: 3 },
          { status: 409, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      const started = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      return Response.json(
        {
          alert: true,
          errorRate,
          total,
          error500,
          threshold: 3,
          text:
            `⚠️ Error rate tăng\n\n` +
            `Domain: khiempg.id.vn\n` +
            `HTTP 500: ${errorRate.toFixed(2)}% (${error500}/${total})\n` +
            `Started: ${started}\n\n` +
            `[Xem Analytics] https://dash.cloudflare.com/42b28ab2f9dba1c757ed380ca4fb5389/khiempg.id.vn/analytics/traffic\n` +
            `[Xem Worker Logs] https://dash.cloudflare.com/42b28ab2f9dba1c757ed380ca4fb5389/workers/services/view/restaurant-order/production/observability/logs\n` +
            `[Kiểm tra Origin] https://khiempg.id.vn/`,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;
    }

    return handleNestRequest(request, env, ctx);
  },
} satisfies ExportedHandler<WorkerEnv>;
