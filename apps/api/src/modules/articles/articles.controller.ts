import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  PERMISSIONS,
  createArticleSchema,
  updateArticleSchema,
  type CreateArticleInput,
  type UpdateArticleInput,
} from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CurrentBrand } from '../../common/decorators/current-brand.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ArticlesService } from './articles.service';
import { StorageService } from '../storage/storage.service';

@Controller()
export class ArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly storage: StorageService,
  ) {}

  @Get('collections/:collectionId/articles')
  @Permissions(PERMISSIONS.ARTICLE_READ)
  listByCollection(
    @CurrentBrand() brandId: string,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
  ) {
    return this.articles.listByCollection(brandId, collectionId);
  }

  @Get('articles/:id')
  @Permissions(PERMISSIONS.ARTICLE_READ)
  detail(@CurrentBrand() brandId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.articles.getById(brandId, id);
  }

  @Post('articles')
  @Permissions(PERMISSIONS.ARTICLE_CREATE)
  create(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(createArticleSchema)) dto: CreateArticleInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.create(brandId, dto, user.id);
  }

  @Patch('articles/:id')
  @Permissions(PERMISSIONS.ARTICLE_UPDATE)
  update(
    @CurrentBrand() brandId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateArticleSchema)) dto: UpdateArticleInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.update(brandId, id, dto, user.id);
  }

  @Delete('articles/:id')
  @Permissions(PERMISSIONS.ARTICLE_DELETE)
  remove(@CurrentBrand() brandId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.articles.remove(brandId, id);
  }

  @Post('articles/:id/image')
  @Permissions(PERMISSIONS.ARTICLE_UPDATE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentBrand() brandId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Verify the article belongs to this brand before uploading
    await this.articles.getById(brandId, id);
    const imageUrl = await this.storage.uploadArticleImage(id, file);
    return this.articles.setImage(brandId, id, imageUrl);
  }
}
