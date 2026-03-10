import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SystemConfigService } from './system-config.service';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { MESSAGES } from '../../common/constants/messages.constant';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @HttpCode(200)
  async get() {
    return await this.systemConfigService.get();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(200)
  @Permissions(Permission.SETTING_MANAGE)
  async update(
    @Body() updateDto: UpdateSystemConfigDto,
    @GetCurrentUserId() userId: number,
  ) {
    return await this.systemConfigService.update(updateDto, userId);
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(200)
  @Permissions(Permission.SETTING_MANAGE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/logos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `logo-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @GetCurrentUserId() userId: number,
  ) {
    if (!file) {
      throw new BadRequestException(MESSAGES.FILE_REQUIRED);
    }
    const logoUrl = `/public/logos/${file.filename}`;
    return await this.systemConfigService.update({ logoUrl }, userId);
  }
}
