import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { z } from 'zod';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { NoBrand } from '../../common/decorators/current-brand.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

const setActiveSchema = z.object({ isActive: z.boolean() });
const setPlatformAdminSchema = z.object({ isPlatformAdmin: z.boolean() });

/**
 * Platform-level user administration. Brand membership management lives on
 * /brands/current/members (see BrandsController).
 */
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  @NoBrand()
  list(@CurrentUser() user: AuthenticatedUser) {
    if (!user.isPlatformAdmin) throw new ForbiddenException('Platform admin only');
    return this.users.findAll();
  }

  @Get('users/:id')
  @NoBrand()
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    if (!user.isPlatformAdmin && user.id !== id) {
      throw new ForbiddenException('Cannot read another user');
    }
    return this.users.findById(id);
  }

  @Patch('users/:id/active')
  @NoBrand()
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(setActiveSchema)) dto: z.infer<typeof setActiveSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.isPlatformAdmin) throw new ForbiddenException('Platform admin only');
    return this.users.setActive(id, dto.isActive);
  }

  @Patch('users/:id/platform-admin')
  @NoBrand()
  setPlatformAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(setPlatformAdminSchema)) dto: z.infer<typeof setPlatformAdminSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.isPlatformAdmin) throw new ForbiddenException('Platform admin only');
    return this.users.setPlatformAdmin(id, dto.isPlatformAdmin);
  }

  @Get('roles')
  @NoBrand()
  listRoles() {
    return this.users.listRoles();
  }
}
