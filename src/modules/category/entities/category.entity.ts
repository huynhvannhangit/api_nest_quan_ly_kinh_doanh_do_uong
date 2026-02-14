import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ name: 'ten_loai' })
  name: string;

  @Column({ name: 'mo_ta', nullable: true })
  description: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
