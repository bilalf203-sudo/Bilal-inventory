import { Injectable } from '@nestjs/common';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@bilal/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(brandId: string) {
    const rows = await this.prisma.settings.findMany({ where: { brandId } });
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return {
      lowStockThreshold: (map.low_stock_threshold as number) ?? DEFAULT_LOW_STOCK_THRESHOLD,
    };
  }

  async setLowStockThreshold(brandId: string, value: number, userId: string) {
    return this.prisma.settings.upsert({
      where: { brandId_key: { brandId, key: 'low_stock_threshold' } },
      create: { brandId, key: 'low_stock_threshold', value, updatedBy: userId },
      update: { value, updatedBy: userId },
    });
  }
}
