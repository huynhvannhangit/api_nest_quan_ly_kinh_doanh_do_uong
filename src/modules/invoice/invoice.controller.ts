import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { Invoice, PaymentMethod } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
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
  findAll(): Promise<Invoice[]> {
    return this.invoiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Invoice> {
    return this.invoiceService.findOne(+id);
  }

  @Patch(':id')
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
  @Permissions(Permission.INVOICE_DELETE)
  @ActionLog({
    action: 'DELETE_INVOICE',
    module: 'INVOICE',
    description: 'Xóa hóa đơn (Soft delete)',
  })
  remove(
    @Param('id') id: string,
    @GetCurrentUserId() userId: number,
  ): Promise<void> {
    return this.invoiceService.remove(+id, userId);
  }
}
