import { Controller, Post, Body } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUser } from '../../core/decorators/get-current-user.decorator';
import type { UserPayload } from '../../core/auth/types';

@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @Permissions(Permission.AI_ASSISTANT_CHAT)
  chat(@Body() data: AiChatDto, @GetCurrentUser() user: UserPayload) {
    return this.aiAssistantService.chat(data.message, data.history, user.role);
  }
}
