import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Permission } from '../../../common/enums/permission.enum';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Hide password by default
  password: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STAFF })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'json', nullable: true })
  permissions: Permission[];

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({
    name: 'verification_token',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  verificationToken: string | null;

  @Column({
    name: 'reset_password_token',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  resetPasswordToken: string | null;

  @Column({
    name: 'reset_password_expires',
    type: 'datetime',
    nullable: true,
    select: false,
  })
  resetPasswordExpires: Date | null;

  @Column({
    name: 'refresh_token',
    type: 'varchar',
    nullable: true,
    select: false,
  })
  refreshToken: string;

  @Column({ name: 'device_id', type: 'varchar', nullable: true })
  deviceId: string | null;
}
