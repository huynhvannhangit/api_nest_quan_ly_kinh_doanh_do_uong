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

@Controller('role')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @HttpCode(201)
  @Permissions(Permission.ROLE_CREATE)
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @HttpCode(200)
  @Permissions(Permission.ROLE_VIEW_ALL)
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.ROLE_VIEW_ID)
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @Permissions(Permission.ROLE_UPDATE)
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.ROLE_DELETE)
  remove(@Param('id') id: string) {
    return this.roleService.remove(+id);
  }
}
