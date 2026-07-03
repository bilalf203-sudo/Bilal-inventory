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
  createCollectionSchema,
  updateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CurrentBrand } from '../../common/decorators/current-brand.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CollectionsService } from './collections.service';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  @Permissions(PERMISSIONS.COLLECTION_READ)
  list(@CurrentBrand() brandId: string, @Query('search') search?: string) {
    return this.service.list(brandId, search);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.COLLECTION_READ)
  detail(@CurrentBrand() brandId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(brandId, id);
  }

  @Post()
  @Permissions(PERMISSIONS.COLLECTION_CREATE)
  create(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(createCollectionSchema)) dto: CreateCollectionInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(brandId, dto, user.id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.COLLECTION_UPDATE)
  update(
    @CurrentBrand() brandId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCollectionSchema)) dto: UpdateCollectionInput,
  ) {
    return this.service.update(brandId, id, dto);
  }

  @Delete()
  @Permissions(PERMISSIONS.COLLECTION_DELETE, PERMISSIONS.ARTICLE_DELETE)
  clearAll(@CurrentBrand() brandId: string) {
    return this.service.clearAll(brandId);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.COLLECTION_DELETE)
  remove(@CurrentBrand() brandId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(brandId, id);
  }
}
