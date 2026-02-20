import { Module } from '@nestjs/common';
import { UserModule } from '../../modules/user/user.module';
import { SeedsService } from './seeds.service';
import { RoleModule } from '../../modules/role/role.module';

@Module({
  imports: [UserModule, RoleModule],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule {}
