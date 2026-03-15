import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { Employee } from '../employee/entities/employee.entity';
import { EmailModule } from '../../core/email/email.module';
import { ApprovalModule } from '../approval/approval.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Employee]),
    EmailModule,
    forwardRef(() => ApprovalModule),
    NotificationModule,
  ],
  providers: [
    UserService,
    { provide: 'UserService', useExisting: UserService },
  ],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
