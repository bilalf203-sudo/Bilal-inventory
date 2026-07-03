import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  PERMISSIONS,
  createMarketplaceSchema,
  updateMarketplaceSchema,
  type CreateMarketplaceInput,
  type UpdateMarketplaceInput,
} from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentBrand } from '../../common/decorators/current-brand.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MarketplacesService } from './marketplaces.service';

@Controller('marketplaces')
export class MarketplacesController {
  constructor(private readonly service: MarketplacesService) {}

  @Get()
  @Permissions(PERMISSIONS.MARKETPLACE_READ)
  list(@CurrentBrand() brandId: string, @Query('includeInactive') includeInactive?: string) {
    return this.service.list(brandId, includeInactive === 'true');
  }

  @Get(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_READ)
  detail(@CurrentBrand() brandId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(brandId, id);
  }

  @Get(':id/articles')
  @Permissions(PERMISSIONS.MARKETPLACE_READ)
  listArticles(@CurrentBrand() brandId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.listArticles(brandId, id);
  }

  @Post()
  @Permissions(PERMISSIONS.MARKETPLACE_CREATE)
  create(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(createMarketplaceSchema)) dto: CreateMarketplaceInput,
  ) {
    return this.service.create(brandId, dto);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_UPDATE)
  update(
    @CurrentBrand() brandId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMarketplaceSchema)) dto: UpdateMarketplaceInput,
  ) {
    return this.service.update(brandId, id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MARKETPLACE_DELETE)
  remove(@CurrentBrand() brandId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(brandId, id);
  }
}
