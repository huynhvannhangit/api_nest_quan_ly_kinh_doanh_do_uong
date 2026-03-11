import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { Employee } from './entities/employee.entity';
import { User } from '../user/entities/user.entity';
import { ApprovalModule } from '../approval/approval.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, User]),
    ApprovalModule,
    UserModule,
  ],
  providers: [
    EmployeeService,
    { provide: 'EmployeeService', useExisting: EmployeeService },
  ],
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}
