import { Module } from '@nestjs/common';
import { UserModule } from '../../modules/user/user.module';
import { SeedsService } from './seeds.service';
import { RoleModule } from '../../modules/role/role.module';
import { SystemConfigModule } from '../../modules/system-config/system-config.module';

@Module({
  imports: [UserModule, RoleModule, SystemConfigModule],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule {}
