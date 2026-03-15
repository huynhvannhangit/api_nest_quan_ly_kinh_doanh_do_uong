import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserService } from './user.service';
import { CreateUserAdminDto, UpdateUserAdminDto } from './dto/admin-user.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';
import { MESSAGES } from '../../common/constants/messages.constant';
import { User } from './entities/user.entity';
import { ApprovalRequest } from '../approval/entities/approval-request.entity';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(201)
  @Permissions(Permission.USER_CREATE)
  create(
    @Body() createUserDto: CreateUserAdminDto,
    @GetCurrentUserId() userId: number,
    @Body('reason') reason?: string,
  ): Promise<User | ApprovalRequest> {
    return this.userService.create(createUserDto, userId, reason);
  }

  @Get()
  @HttpCode(200)
  @Permissions(Permission.USER_VIEW)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.USER_VIEW)
  findOne(@Param('id') id: string) {
    return this.userService.findById(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @Permissions(Permission.USER_UPDATE)
  update(
    @Param('id') id: string,
    @Body() updateData: UpdateUserAdminDto,
    @GetCurrentUserId() userId: number,
    @Body('reason') reason?: string,
  ): Promise<User | ApprovalRequest | undefined> {
    return this.userService.update(+id, updateData, userId, reason);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.USER_DELETE)
  remove(
    @Param('id') id: string,
    @GetCurrentUserId() userId: number,
    @Body('reason') reason?: string,
  ): Promise<void | ApprovalRequest> {
    return this.userService.remove(+id, userId, reason);
  }

  @Post(':id/avatar')
  @HttpCode(200)
  @Permissions(Permission.USER_UPDATE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetCurrentUserId() userId: number,
  ): Promise<User | ApprovalRequest | undefined> {
    if (!file) {
      throw new BadRequestException(MESSAGES.FILE_REQUIRED);
    }
    const avatarUrl = `/public/avatars/${file.filename}`;
    return this.userService.update(+id, { avatar: avatarUrl }, userId);
  }
}
