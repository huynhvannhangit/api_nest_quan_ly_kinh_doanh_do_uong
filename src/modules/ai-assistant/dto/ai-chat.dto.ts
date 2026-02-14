import { IsNotEmpty, IsString } from 'class-validator';

export class AiChatDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
