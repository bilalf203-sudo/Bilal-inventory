import { Controller, Get, Query } from '@nestjs/common';
import { PERMISSIONS } from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentBrand } from '../../common/decorators/current-brand.decorator';
import { AuditService } from './audit.service';

@Controller('audit-log')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Permissions(PERMISSIONS.AUDIT_LOG_READ)
  list(
    @CurrentBrand() brandId: string,
    @Query('entity') entity?: string,
    @Query('take') take?: string,
  ) {
    return this.audit.list({
      brandId,
      entity,
      take: take ? parseInt(take, 10) : 100,
    });
  }
}
