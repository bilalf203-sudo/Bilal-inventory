import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  PERMISSIONS,
  createBrandSchema,
  inviteBrandMemberSchema,
  updateBrandMemberRoleSchema,
  updateBrandSchema,
  type CreateBrandInput,
  type InviteBrandMemberInput,
  type UpdateBrandInput,
  type UpdateBrandMemberRoleInput,
} from '@bilal/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import {
  CurrentBrand,
  NoBrand,
} from '../../common/decorators/current-brand.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BrandsService } from './brands.service';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  /** List brands the user can access. No brand context required. */
  @Get()
  @NoBrand()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.brands.listForUser(user.id, user.isPlatformAdmin);
  }

  /** Create a new brand. Platform admin only. */
  @Post()
  @NoBrand()
  create(
    @Body(new ZodValidationPipe(createBrandSchema)) dto: CreateBrandInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can create brands');
    }
    return this.brands.create(dto, user.id);
  }

  /** Get current brand (X-Brand-Id). Any member may read. */
  @Get('current')
  @Permissions(PERMISSIONS.BRAND_READ)
  current(@CurrentBrand() brandId: string) {
    return this.brands.getById(brandId);
  }

  /** Update the current brand. Requires brand.update permission. */
  @Patch('current')
  @Permissions(PERMISSIONS.BRAND_UPDATE)
  update(
    @CurrentBrand() brandId: string,
    @Body(new ZodValidationPipe(updateBrandSchema)) dto: UpdateBrandInput,
  ) {
    return this.brands.update(brandId, dto);
  }

  /** Delete the current brand. Platform admin only. */
  @Delete(':id')
  @NoBrand()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('Only platform admins can delete brands');
    }
    return this.brands.remove(id);
  }

  // ---- Members ----

  @Get('current/members')
  @Permissions(PERMISSIONS.BRAND_MEMBER_READ)
  listMembers(@CurrentBrand() brandId: string) {
    return this.brands.listMembers(brandId);
  }

  @Post('current/members')
  @Permissions(PERMISSIONS.BRAND_MEMBER_INVITE)
  invite(
    @CurrentBrand() brandId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(inviteBrandMemberSchema)) dto: InviteBrandMemberInput,
  ) {
    return this.brands.inviteMember(brandId, dto, user.id);
  }

  @Patch('current/members/:userId')
  @Permissions(PERMISSIONS.BRAND_MEMBER_UPDATE_ROLE)
  updateMemberRole(
    @CurrentBrand() brandId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body(new ZodValidationPipe(updateBrandMemberRoleSchema)) dto: UpdateBrandMemberRoleInput,
  ) {
    return this.brands.updateMemberRole(brandId, userId, dto.roleId);
  }

  @Delete('current/members/:userId')
  @Permissions(PERMISSIONS.BRAND_MEMBER_REMOVE)
  removeMember(
    @CurrentBrand() brandId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.brands.removeMember(brandId, userId);
  }
}
