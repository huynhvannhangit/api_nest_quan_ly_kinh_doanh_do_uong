import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { Invoice, PaymentMethod } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('invoice')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @HttpCode(201)
  @Permissions(Permission.INVOICE_CREATE)
  @ActionLog({
    action: 'CREATE_INVOICE',
    module: 'INVOICE',
    description: 'Tạo hóa đơn mới',
  })
  create(
    @Body() data: CreateInvoiceDto,
    @GetCurrentUserId() userId: number,
  ): Promise<Invoice> {
    return this.invoiceService.create(
      data as unknown as Partial<Invoice>,
      userId,
    );
  }

  @Get()
  @HttpCode(200)
  @Permissions(Permission.INVOICE_VIEW_ALL)
  findAll(@Query('keyword') keyword?: string): Promise<Invoice[]> {
    return this.invoiceService.findAll(keyword);
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.INVOICE_VIEW_ID)
  findOne(@Param('id') id: string): Promise<Invoice> {
    return this.invoiceService.findOne(+id);
  }

  @Post(':id/pay')
  @HttpCode(200)
  @Permissions(Permission.INVOICE_PAY)
  @ActionLog({
    action: 'PROCESS_PAYMENT',
    module: 'INVOICE',
    description: 'Xử lý thanh toán hóa đơn',
  })
  processPayment(
    @Param('id') id: string,
    @Body() data: { paymentMethod: PaymentMethod },
    @GetCurrentUserId() userId: number,
  ): Promise<Invoice> {
    return this.invoiceService.processPayment(+id, data, userId);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Permissions(Permission.INVOICE_CANCEL)
  @ActionLog({
    action: 'CANCEL_INVOICE',
    module: 'INVOICE',
    description: 'Hủy hóa đơn',
  })
  cancel(
    @Param('id') id: string,
    @GetCurrentUserId() userId: number,
  ): Promise<Invoice> {
    return this.invoiceService.cancel(+id, userId);
  }
}
