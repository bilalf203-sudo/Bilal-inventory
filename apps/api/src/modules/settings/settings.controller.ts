import { Body, Controller, Get, Patch } from '@nestjs/common';
import { z } from 'zod';
import { PERMISSIONS } from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CurrentBrand } from '../../common/decorators/current-brand.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SettingsService } from './settings.service';

const thresholdSchema = z.object({
  lowStockThreshold: z.coerce.number().int().min(1).max(10000),
});

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Permissions(PERMISSIONS.SETTINGS_READ)
  read(@CurrentBrand() brandId: string) {
    return this.settings.getAll(brandId);
  }

  @Patch('low-stock-threshold')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE)
  setThreshold(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(thresholdSchema)) dto: z.infer<typeof thresholdSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settings.setLowStockThreshold(brandId, dto.lowStockThreshold, user.id);
  }
}
