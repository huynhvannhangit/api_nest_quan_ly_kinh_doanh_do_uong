import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLog } from './entities/user-log.entity';
import { LoggingService } from './logging.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserLog])],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
