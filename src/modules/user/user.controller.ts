import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions(Permission.USER_CREATE)
  create(
    @Body() createUserDto: CreateUserDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.userService.create(createUserDto, userId);
  }

  @Get()
  @Permissions(Permission.USER_VIEW)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @Permissions(Permission.USER_VIEW)
  findOne(@Param('id') id: string) {
    return this.userService.findById(+id);
  }

  @Patch(':id')
  @Permissions(Permission.USER_UPDATE)
  update(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.userService.update(+id, updateData, userId);
  }

  @Delete(':id')
  @Permissions(Permission.USER_DELETE)
  remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.userService.remove(+id, userId);
  }
}
