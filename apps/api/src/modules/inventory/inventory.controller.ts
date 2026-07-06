import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
} from '@nestjs/common';
import {
  PERMISSIONS,
  allocateMoreSchema,
  assignArticleToMarketplaceSchema,
  recordSaleSchema,
  returnToWarehouseSchema,
  salesReportCommitSchema,
  salesReportPreviewSchema,
  undoSaleSchema,
  updateSalePriceSchema,
  type AllocateMoreInput,
  type AssignArticleToMarketplaceInput,
  type RecordSaleInput,
  type ReturnToWarehouseInput,
  type SalesReportCommitInput,
  type SalesReportPreviewInput,
  type UndoSaleInput,
  type UpdateSalePriceInput,
} from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CurrentBrand } from '../../common/decorators/current-brand.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post('assign')
  @Permissions(PERMISSIONS.MARKETPLACE_ASSIGN_ARTICLE, PERMISSIONS.INVENTORY_ALLOCATE)
  assign(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(assignArticleToMarketplaceSchema)) dto: AssignArticleToMarketplaceInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.assignArticleToMarketplace(brandId, dto, user.id);
  }

  @Post('allocate')
  @Permissions(PERMISSIONS.INVENTORY_ALLOCATE)
  allocateMore(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(allocateMoreSchema)) dto: AllocateMoreInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.allocateMore(brandId, dto, user.id);
  }

  @Patch('sale-price')
  @Permissions(PERMISSIONS.MARKETPLACE_SET_PRICE)
  updatePrice(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(updateSalePriceSchema)) dto: UpdateSalePriceInput,
  ) {
    return this.inventory.updateSalePrice(brandId, dto);
  }

  @Post('sales')
  @Permissions(PERMISSIONS.SALE_RECORD)
  recordSale(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(recordSaleSchema)) dto: RecordSaleInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.recordSale(brandId, dto, user.id);
  }

  @Post('sales/undo')
  @Permissions(PERMISSIONS.SALE_RECORD)
  undoSale(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(undoSaleSchema)) dto: UndoSaleInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.undoSale(brandId, dto, user.id);
  }

  @Post('return')
  @Permissions(PERMISSIONS.INVENTORY_RETURN)
  returnToWarehouse(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(returnToWarehouseSchema)) dto: ReturnToWarehouseInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.returnToWarehouse(brandId, dto, user.id);
  }

  @Post('sales-report/preview')
  @Permissions(PERMISSIONS.SALE_RECORD)
  previewSalesReport(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(salesReportPreviewSchema)) dto: SalesReportPreviewInput,
  ) {
    return this.inventory.previewSalesReport(brandId, dto);
  }

  @Post('sales-report/commit')
  @Permissions(PERMISSIONS.SALE_RECORD)
  commitSalesReport(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(salesReportCommitSchema)) dto: SalesReportCommitInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventory.commitSalesReport(brandId, dto, user.id);
  }

  @Get('stock/article/:articleId')
  @Permissions(PERMISSIONS.INVENTORY_READ)
  stockBreakdown(
    @CurrentBrand() brandId: string,
    @Param('articleId', ParseUUIDPipe) articleId: string,
  ) {
    return this.inventory.getArticleStockBreakdown(brandId, articleId);
  }

  @Get('low-stock')
  @Permissions(PERMISSIONS.INVENTORY_READ)
  lowStock(@CurrentBrand() brandId: string) {
    return this.inventory.getLowStockArticles(brandId);
  }

  @Get('movements/article/:articleId')
  @Permissions(PERMISSIONS.INVENTORY_READ)
  movements(
    @CurrentBrand() brandId: string,
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @Query('take') take?: string,
  ) {
    const limit = take ? Math.min(parseInt(take, 10) || 100, 500) : 100;
    return this.inventory.listMovementsForArticle(brandId, articleId, limit);
  }
}
