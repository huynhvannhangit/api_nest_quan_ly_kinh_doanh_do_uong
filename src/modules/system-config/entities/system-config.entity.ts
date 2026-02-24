import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('system_configs')
export class SystemConfig extends BaseEntity {
  @Column({ name: 'system_name', default: 'Quản lý kinh doanh Đồ Uống' })
  systemName: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'footer_text', type: 'text', nullable: true })
  footerText: string | null;
}
