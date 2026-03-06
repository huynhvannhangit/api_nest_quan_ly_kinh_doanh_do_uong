import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum EmployeeStatus {
  WORKING = 'WORKING',
  RESIGNED = 'RESIGNED',
}

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ name: 'employee_code', unique: true })
  employeeCode: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'identity_card', unique: true, nullable: true })
  identityCard: string;

  @Column({ type: 'date', nullable: true, name: 'birth_date' })
  birthDate: Date;

  @Column({ nullable: true })
  position: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  salary: number;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.WORKING,
  })
  status: EmployeeStatus;

  @Column({ name: 'user_id', nullable: true, unique: true })
  userId: number;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
