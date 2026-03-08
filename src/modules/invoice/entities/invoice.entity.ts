import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Table } from '../../table/entities/table.entity';
import { User } from '../../user/entities/user.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Order } from '../../order/entities/order.entity';

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  QR = 'QR',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
}

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @ManyToOne(() => Table)
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ name: 'table_number_snapshot', type: 'varchar', nullable: true })
  tableNameSnapshot: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updater: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({
    name: 'discount_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercent: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date;

  @OneToMany(() => InvoiceItem, (item: InvoiceItem) => item.invoice, {
    cascade: true,
  })
  items: InvoiceItem[];

  @Column({ name: 'order_id', nullable: true })
  orderId: number;

  @OneToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
