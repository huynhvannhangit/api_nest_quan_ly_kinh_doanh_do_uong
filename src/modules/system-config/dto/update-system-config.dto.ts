import { IsString, IsOptional, IsEmail, ValidateIf } from 'class-validator';
import { MESSAGES } from '../../../common/constants/messages.constant';

export class UpdateSystemConfigDto {
  @IsString()
  @IsOptional()
  systemName?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ValidateIf(
    (o: UpdateSystemConfigDto) => o.email !== undefined && o.email !== '',
  )
  @IsEmail({}, { message: MESSAGES.INVALID_EMAIL })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  footerText?: string;
}
