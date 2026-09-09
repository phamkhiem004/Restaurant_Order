/// <reference types="@cloudflare/workers-types" />

import { httpServerHandler } from 'cloudflare:node';

type NodeHttpHandler = ReturnType<typeof httpServerHandler>;

interface WorkerEnv {
  DB: D1Database;
  VNP_TMN_CODE?: string;
  VNP_HASH_SECRET?: string;
  VNP_URL?: string;
  VNP_RETURN_URL?: string;
  NODE_ENV?: string;
}

function copyBindingToProcessEnv(env: WorkerEnv): void {
  const variableNames = [
    'VNP_TMN_CODE',
    'VNP_HASH_SECRET',
    'VNP_URL',
    'VNP_RETURN_URL',
    'NODE_ENV',
  ] as const;

  for (const name of variableNames) {
    const value = env[name];
    if (value !== undefined) {
      process.env[name] = value;
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

    return handleNestRequest(request, env, ctx);
  },
} satisfies ExportedHandler<WorkerEnv>;
