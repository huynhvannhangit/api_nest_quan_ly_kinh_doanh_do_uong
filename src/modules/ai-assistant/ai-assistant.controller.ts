import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUser } from '../../core/decorators/get-current-user.decorator';
import type { UserPayload } from '../../core/auth/types';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @HttpCode(200)
  @Permissions(Permission.AI_ASSISTANT_CHAT)
  chat(@Body() data: AiChatDto, @GetCurrentUser() user: UserPayload) {
    return this.aiAssistantService.chat(data.message, data.history, user.role);
  }
}
