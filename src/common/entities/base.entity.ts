import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Audit Creation
  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Audit Update
  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Audit Deletion
  @Column({ name: 'deleted_by', nullable: true, select: false })
  deletedBy: number;

  @DeleteDateColumn({ name: 'deleted_at', select: false })
  deletedAt: Date;
}
