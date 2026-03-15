import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleService } from './roles.service';
import { RoleController } from './role.controller';
import { Role } from './entities/role.entity';
import { UserModule } from '../user/user.module';
import { ApprovalModule } from '../approval/approval.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role]),
    UserModule,
    forwardRef(() => ApprovalModule),
    NotificationModule,
  ],
  controllers: [RoleController],
  providers: [
    RoleService,
    { provide: 'RoleService', useExisting: RoleService },
  ],
  exports: [RoleService],
})
export class RoleModule {}
