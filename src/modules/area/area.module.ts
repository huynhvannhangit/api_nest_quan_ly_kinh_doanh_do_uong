import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { AreaService } from './area.service';
import { AreaController } from './area.controller';
import { Area } from './entities/area.entity';
import { Table } from '../table/entities/table.entity';
import { ApprovalModule } from '../approval/approval.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Area, Table]),
    forwardRef(() => ApprovalModule),
    UserModule,
    NotificationModule,
  ],
  providers: [
    AreaService,
    { provide: 'AreaService', useExisting: AreaService },
  ],
  controllers: [AreaController],
  exports: [AreaService],
})
export class AreaModule {}
