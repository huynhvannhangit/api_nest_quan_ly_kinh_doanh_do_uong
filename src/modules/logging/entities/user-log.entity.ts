import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_logs')
export class UserLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, name: 'user_id' })
  @Index()
  userId: number;

  @Column()
  @Index()
  action: string;

  @Column({ nullable: true })
  @Index()
  module: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
