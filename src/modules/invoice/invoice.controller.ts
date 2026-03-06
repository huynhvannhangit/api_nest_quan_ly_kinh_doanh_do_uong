import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { Invoice, PaymentMethod } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('invoice')
@UseGuards(JwtAuthGuard)
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
  findAll(@Query('keyword') keyword?: string): Promise<Invoice[]> {
    return this.invoiceService.findAll(keyword);
  }

  @Get(':id')
  @HttpCode(200)
  findOne(@Param('id') id: string): Promise<Invoice> {
    return this.invoiceService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @Permissions(Permission.INVOICE_UPDATE)
  @ActionLog({
    action: 'UPDATE_INVOICE',
    module: 'INVOICE',
    description: 'Cập nhật hóa đơn',
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateInvoiceDto,
    @GetCurrentUserId() userId: number,
  ): Promise<Invoice> {
    return this.invoiceService.update(
      +id,
      data as unknown as Partial<Invoice>,
      userId,
    );
  }

  @Post(':id/pay')
  @HttpCode(200)
  @Permissions(Permission.INVOICE_UPDATE)
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

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.INVOICE_DELETE)
  @ActionLog({
    action: 'DELETE_INVOICE',
    module: 'INVOICE',
    description: 'Xóa hóa đơn (Soft delete)',
  })
  remove(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @GetCurrentUserId() userId: number,
  ): Promise<void> {
    return this.invoiceService.remove(+id, userId, body?.reason);
  }
}
