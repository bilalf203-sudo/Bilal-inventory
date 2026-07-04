import { Controller, Get } from '@nestjs/common';
import { PERMISSIONS } from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentBrand } from '../../common/decorators/current-brand.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @Permissions(PERMISSIONS.INVENTORY_READ)
  summary(@CurrentBrand() brandId: string) {
    return this.analytics.getSummary(brandId);
  }
}
