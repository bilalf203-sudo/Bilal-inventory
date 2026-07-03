import { Body, Controller, Post } from '@nestjs/common';
import {
  PERMISSIONS,
  importWarehouseSchema,
  type ImportWarehouseInput,
} from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CurrentBrand } from '../../common/decorators/current-brand.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post('warehouse')
  @Permissions(PERMISSIONS.COLLECTION_CREATE, PERMISSIONS.ARTICLE_CREATE)
  importWarehouse(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(importWarehouseSchema)) dto: ImportWarehouseInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.importWarehouse(brandId, dto, user.id);
  }
}
