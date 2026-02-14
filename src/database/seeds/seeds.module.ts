import { Module } from '@nestjs/common';
import { UserModule } from '../../modules/user/user.module';
import { SeedsService } from './seeds.service';

@Module({
  imports: [UserModule],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule {}
