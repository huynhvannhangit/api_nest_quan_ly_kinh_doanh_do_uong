import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async create(data: any, createdBy: number): Promise<Order> {
    const orderNumber = `ORD-${Date.now()}`;
    const order = new Order();
    Object.assign(order, data);
    order.orderNumber = orderNumber;
    order.createdBy = createdBy;
    order.updatedBy = createdBy;
    return this.orderRepository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['items', 'items.product', 'table', 'creator'],
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'table', 'creator'],
    });
    if (!order) throw new Error('Order not found');
    return order;
  }

  async updateStatus(
    id: number,
    status: OrderStatus,
    updatedBy: number,
  ): Promise<Order> {
    await this.orderRepository.update(id, { status, updatedBy });
    return this.findOne(id);
  }

  async remove(id: number, deletedBy: number): Promise<void> {
    const order = await this.findOne(id);
    order.deletedBy = deletedBy;
    await this.orderRepository.save(order);
    await this.orderRepository.softRemove(order);
  }
}
