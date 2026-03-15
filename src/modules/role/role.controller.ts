import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { RoleService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/edit-role.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';

import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';
import { Role } from './entities/role.entity';
import { ApprovalRequest } from '../approval/entities/approval-request.entity';

@Controller('role')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @HttpCode(201)
  @Permissions(Permission.ROLE_CREATE)
  create(
    @Body() createRoleDto: CreateRoleDto,
    @GetCurrentUserId() userId: number,
    @Body('reason') reason?: string,
  ): Promise<Role | ApprovalRequest> {
    return this.roleService.create(createRoleDto, userId, reason);
  }

  @Get()
  @HttpCode(200)
  @Permissions(
    Permission.ROLE_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
  )
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.ROLE_VIEW)
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @Permissions(Permission.ROLE_UPDATE)
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @GetCurrentUserId() userId: number,
    @Body('reason') reason?: string,
  ): Promise<Role | ApprovalRequest> {
    return this.roleService.update(+id, updateRoleDto, userId, reason);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.ROLE_DELETE)
  remove(
    @Param('id') id: string,
    @GetCurrentUserId() userId: number,
    @Body('reason') reason?: string,
  ): Promise<void | ApprovalRequest> {
    return this.roleService.remove(+id, userId, reason);
  }
}
