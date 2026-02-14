import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Area } from '../../area/entities/area.entity';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

@Entity('tables')
export class Table extends BaseEntity {
  @Column({ name: 'table_number' })
  tableNumber: string;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  @Column({ name: 'area_id', nullable: true })
  areaId: number;

  @ManyToOne(() => Area, (area) => area.tables)
  @JoinColumn({ name: 'area_id' })
  area: Area;
}
