import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['error'],
      // Interactive transactions default to a 5s timeout, which multi-step
      // flows exceed against a remote (pooled) database — they then die
      // mid-flight with "Transaction not found". Give all of them headroom;
      // per-call options (e.g. the sales-report commit) still override this.
      transactionOptions: { timeout: 30_000, maxWait: 10_000 },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
