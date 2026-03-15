import { IsNumber, IsOptional, IsEnum, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { UserStatus } from '../entities/user.entity';

export class CreateUserAdminDto extends CreateUserDto {
  @IsOptional()
  @IsNumber()
  roleId?: number;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserAdminDto extends UpdateUserDto {
  @IsOptional()
  @IsNumber()
  roleId?: number;

  @IsOptional()
  role?: unknown;
}
