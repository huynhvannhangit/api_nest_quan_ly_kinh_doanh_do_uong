import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLog } from './entities/user-log.entity';
import { LoggingService } from './logging.service';
import { LoggingController } from './logging.controller';
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserLog]), UserModule],
  controllers: [LoggingController],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
