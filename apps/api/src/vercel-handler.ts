import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Nest is initialized once and its underlying Express instance is reused across
// warm serverless invocations. Mirrors main.ts, minus the local-disk static
// handler (Vercel is ephemeral; STORAGE_DRIVER must be supabase) and app.listen
// (Vercel invokes the exported handler instead of binding a port).
//
// Note: we deliberately do NOT `import express` — it's only a transitive dep of
// @nestjs/platform-express, so requiring it directly fails under pnpm's strict
// node_modules. We take the instance Nest already created instead.
let server: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let ready: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.useBodyParser('json', { limit: '25mb' });
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');
  await app.init();
  server = app.getHttpAdapter().getInstance();
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!ready) ready = bootstrap();
  await ready;
  server!(req, res);
}
