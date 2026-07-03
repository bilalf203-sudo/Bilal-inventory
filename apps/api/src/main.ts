import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { LocalStorageService } from './modules/storage/local-storage.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Bulk CSV imports / sale-report diffs post a few thousand rows at once.
  app.useBodyParser('json', { limit: '25mb' });
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  // Local-disk image storage: serve /uploads as static assets when STORAGE_DRIVER=local.
  // useStaticAssets mounts as middleware so it bypasses the global API prefix.
  if ((process.env.STORAGE_DRIVER ?? 'supabase') === 'local') {
    const local = app.get(LocalStorageService);
    const dir = resolve(local.root);
    await mkdir(dir, { recursive: true });
    app.useStaticAssets(dir, { prefix: '/uploads/' });
    logger.log(`Serving local uploads from ${dir} at /uploads`);
  }

  const port = parseInt(process.env.API_PORT ?? '4000', 10);
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
