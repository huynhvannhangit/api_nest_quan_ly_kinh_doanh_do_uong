import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity'; // Keep Order import
import { OrderStatus } from './entities/order.entity'; // Keep OrderStatus import, adjust path if needed
import { OrderItem } from './entities/order-item.entity';
import { TableService } from '../table/table.service';
import { TableStatus } from '../table/entities/table.entity';
import { Product } from '../product/entities/product.entity';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto'; // Updated DTO import
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly tableService: TableService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(data: CreateOrderDto, createdBy: number): Promise<Order> {
    const orderNumber = `ORD-${Date.now()}`;
    const order = new Order();

    // Manual mapping to ensure relations are set correctly
    order.orderNumber = orderNumber;
    order.tableId = data.tableId ?? null;
    order.notes = data.notes ?? null;
    order.status = data.status || OrderStatus.PENDING;
    order.createdBy = createdBy;
    order.updatedBy = createdBy;

    if (data.items && data.items.length > 0) {
      order.items = data.items.map((item) => {
        const orderItem = new OrderItem();
        orderItem.quantity = item.quantity;
        orderItem.price = item.price;
        orderItem.notes = item.notes ?? null;
        // Link to product entity via ID
        orderItem.product = { id: item.productId } as Product;
        return orderItem;
      });

      // Calculate total price
      order.totalPrice = order.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
    }

    const savedOrder = await this.orderRepository.save(order);

    if (order.tableId) {
      await this.tableService.update(
        order.tableId,
        { status: TableStatus.OCCUPIED },
        createdBy,
      );
    }

    // Gửi thông báo realtime khi có đơn hàng mới
    await this.notificationService.sendNotification(
      'NEW_ORDER',
      'Đơn hàng mới',
      `Đơn hàng ${savedOrder.orderNumber} vừa được tạo${savedOrder.tableId ? ` cho bàn #${savedOrder.tableId}` : ''}`,
      {
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        tableId: savedOrder.tableId,
        totalPrice: savedOrder.totalPrice,
      },
    );

    return savedOrder;
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

  async findActiveByTable(tableId: number): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: [
        { tableId, status: OrderStatus.PENDING },
        { tableId, status: OrderStatus.PROCESSING },
      ],
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async addItems(
    id: number,
    items: CreateOrderItemDto[],
    userId: number,
  ): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Cannot add items to a completed order');
    }

    const newItems = items.map((item) => {
      const orderItem = new OrderItem();
      orderItem.quantity = item.quantity;
      orderItem.price = item.price;
      orderItem.notes = item.notes ?? null;
      orderItem.product = { id: item.productId } as Product;
      orderItem.order = order;
      return orderItem;
    });

    await this.orderItemRepository.save(newItems);

    // Recalculate total price
    const allItems = [...(order.items || []), ...newItems];
    order.totalPrice = allItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );
    order.updatedBy = userId;

    return this.orderRepository.save(order);
  }

  async cancel(id: number, userId: number): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed order');
    }

    order.status = OrderStatus.CANCELLED;
    order.updatedBy = userId;

    const savedOrder = await this.orderRepository.save(order);

    if (order.tableId) {
      await this.tableService.update(
        order.tableId,
        { status: TableStatus.AVAILABLE },
        userId,
      );
    }

    return savedOrder;
  }

  async remove(id: number, deletedBy: number): Promise<void> {
    const order = await this.findOne(id);
    order.deletedBy = deletedBy;
    await this.orderRepository.save(order);
    await this.orderRepository.softRemove(order);
  }
}
