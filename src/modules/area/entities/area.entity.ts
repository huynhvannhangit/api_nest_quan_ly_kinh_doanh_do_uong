import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Table } from '../../table/entities/table.entity';

@Entity('areas')
export class Area extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Table, (table) => table.area)
  tables: Table[];
}
