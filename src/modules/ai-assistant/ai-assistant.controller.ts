import { Controller, Post, Body } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @Permissions(Permission.AI_ASSISTANT_CHAT)
  chat(@Body() data: AiChatDto) {
    return this.aiAssistantService.chat(data.message);
  }
}
