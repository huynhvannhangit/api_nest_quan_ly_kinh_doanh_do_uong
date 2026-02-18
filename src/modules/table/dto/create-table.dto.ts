import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { TableStatus } from '../entities/table.entity';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  tableNumber: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Capacity must be a positive number' })
  capacity?: number;

  @IsEnum(TableStatus)
  @IsOptional()
  status?: TableStatus;

  @IsNumber()
  @IsNotEmpty()
  areaId: number;
}
