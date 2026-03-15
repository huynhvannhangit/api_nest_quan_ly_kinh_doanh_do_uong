import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { TableModule } from '../table/table.module';
import { OrderModule } from '../order/order.module';
import { ApprovalModule } from '../approval/approval.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem]),
    TableModule,
    OrderModule,
    forwardRef(() => ApprovalModule),
    UserModule,
  ],
  providers: [InvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceModule {}
