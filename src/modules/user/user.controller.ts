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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';
import { MESSAGES } from '../../common/constants/messages.constant';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(201)
  @Permissions(Permission.USER_MANAGE)
  create(
    @Body() createUserDto: CreateUserDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.userService.create(createUserDto, userId);
  }

  @Get()
  @HttpCode(200)
  @Permissions(Permission.USER_VIEW_ALL)
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.USER_VIEW_ID)
  findOne(@Param('id') id: string) {
    return this.userService.findById(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @Permissions(Permission.USER_MANAGE)
  update(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
    @GetCurrentUserId() userId: number,
  ) {
    return this.userService.update(+id, updateData, userId);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.USER_DELETE)
  remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.userService.remove(+id, userId);
  }

  @Post(':id/avatar')
  @HttpCode(200)
  @Permissions(Permission.USER_MANAGE)
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
  ) {
    if (!file) {
      throw new BadRequestException(MESSAGES.FILE_REQUIRED);
    }
    const avatarUrl = `/public/avatars/${file.filename}`;
    return this.userService.update(+id, { avatar: avatarUrl }, userId);
  }
}
