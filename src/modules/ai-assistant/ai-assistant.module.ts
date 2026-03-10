import { Module } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { AiAssistantController } from './ai-assistant.controller';
import { StatisticsModule } from '../statistics/statistics.module';
import { ProductModule } from '../product/product.module';
import { CategoryModule } from '../category/category.module';
import { AreaModule } from '../area/area.module';
import { TableModule } from '../table/table.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    StatisticsModule,
    ProductModule,
    CategoryModule,
    AreaModule,
    TableModule,
    InvoiceModule,
    UserModule,
  ],
  providers: [AiAssistantService],
  controllers: [AiAssistantController],
})
export class AiAssistantModule {}
