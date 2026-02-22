import { IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';

import { PaymentMethod } from '../entities/invoice.entity';

export class CreateInvoiceDto {
  @IsNumber()
  @IsNotEmpty()
  orderId: number;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
}
