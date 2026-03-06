import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { Employee } from '../employee/entities/employee.entity';
import { EmailModule } from '../../core/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Employee]), EmailModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
