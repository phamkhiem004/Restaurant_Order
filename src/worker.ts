/// <reference types="@cloudflare/workers-types" />

import { httpServerHandler } from 'cloudflare:node';

interface WorkerEnv {
  HYPERDRIVE?: Hyperdrive;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  VNP_TMN_CODE?: string;
  VNP_HASH_SECRET?: string;
  VNP_URL?: string;
  VNP_RETURN_URL?: string;
  NODE_ENV?: string;
}

function copyBindingToProcessEnv(env: WorkerEnv): void {
  const hyperdrive = env.HYPERDRIVE;

  if (hyperdrive) {
    process.env.DB_HOST = hyperdrive.host;
    process.env.DB_PORT = String(hyperdrive.port);
    process.env.DB_USERNAME = hyperdrive.user;
    process.env.DB_PASSWORD = hyperdrive.password;
    process.env.DB_NAME = hyperdrive.database;
  }

  const variableNames = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
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

async function handleNestRequest(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  copyBindingToProcessEnv(env);

  // Loading the Nest application inside fetch keeps decorator/module setup and
  // TypeORM initialization inside the Cloudflare request context.
  const { createNestApp } = await import('./bootstrap.js');
  const app = await createNestApp();
  await app.init();

  const server = app.getHttpServer() as Parameters<typeof httpServerHandler>[0];
  const handler = httpServerHandler(server);

  try {
    if (!handler.fetch) {
      throw new Error('Cloudflare Node HTTP handler does not expose fetch().');
    }

    return await handler.fetch(
      request as Parameters<NonNullable<typeof handler.fetch>>[0],
      env,
      ctx,
    );
  } finally {
    // A TypeORM/mysql2 connection cannot be reused by a later Worker request.
    await app.close();
  }
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
