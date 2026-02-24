import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsString()
  @IsOptional()
  systemName?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsEmail()
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
