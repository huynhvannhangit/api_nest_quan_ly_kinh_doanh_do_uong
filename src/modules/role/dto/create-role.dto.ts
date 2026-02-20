import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Permission } from '../../../common/enums/permission.enum';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsEnum(Permission, { each: true })
  @IsOptional()
  permissions: Permission[];

  @IsBoolean()
  @IsOptional()
  isActive: boolean;
}
