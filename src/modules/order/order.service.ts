import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './entities/order.entity'; // Keep Order import
import { OrderStatus } from './entities/order.entity'; // Keep OrderStatus import, adjust path if needed
import { OrderItem } from './entities/order-item.entity';
import { TableService } from '../table/table.service';
import { TableStatus } from '../table/entities/table.entity';
import { Product } from '../product/entities/product.entity';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto'; // Updated DTO import
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/notification.dto';

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
      await this.tableService.executeUpdate(
        order.tableId,
        { status: TableStatus.OCCUPIED },
        createdBy,
        true,
      );
    }

    // Gửi thông báo realtime khi có đơn hàng mới (Non-blocking)
    void this.notificationService.sendNotification(
      NotificationType.NEW_ORDER,
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

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.orderRepository.findAndCount({
      relations: ['items', 'items.product', 'table', 'creator'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
    console.log(
      `[OrderService] findActiveByTable: tableId=${tableId} (${typeof tableId})`,
    );

    const order = await this.orderRepository.findOne({
      where: {
        tableId: tableId,
        status: In([OrderStatus.PENDING, OrderStatus.PROCESSING]),
      },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    console.log(
      `[OrderService] findActiveByTable result for tableId=${tableId}:`,
      order ? order.orderNumber : 'null',
    );
    return order;
  }

  async addItems(
    id: number,
    items: CreateOrderItemDto[],
    userId: number,
    notes?: string,
  ): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Cannot add items to a completed order');
    }

    if (notes !== undefined) {
      order.notes = notes;
    }

    const currentItems = order.items || [];

    for (const itemDto of items) {
      const existingItem = currentItems.find(
        (i) => i.product.id === Number(itemDto.productId),
      );

      if (existingItem) {
        // Update existing item quantity
        existingItem.quantity =
          Number(existingItem.quantity) + Number(itemDto.quantity);
        await this.orderItemRepository.save(existingItem);
      } else {
        // Create new item
        const orderItem = new OrderItem();
        orderItem.quantity = itemDto.quantity;
        orderItem.price = itemDto.price;
        orderItem.notes = itemDto.notes ?? null;
        orderItem.product = { id: itemDto.productId } as Product;
        orderItem.order = order;
        const savedItem = await this.orderItemRepository.save(orderItem);
        currentItems.push(savedItem);
      }
    }

    // Update order with direct update
    await this.orderRepository.update(id, {
      notes: order.notes,
      totalPrice: currentItems.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0,
      ),
      updatedBy: userId,
    });

    const savedOrder = await this.findOne(id);

    // Send notification
    void this.notificationService.sendNotification(
      NotificationType.ORDER_STATUS_UPDATED,
      'Thêm món vào đơn',
      `Món mới đã được thêm vào đơn hàng ${savedOrder.orderNumber}`,
      { orderId: savedOrder.id },
    );

    return savedOrder;
  }

  async cancel(id: number, userId: number): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed order');
    }

    await this.orderRepository.update(id, {
      status: OrderStatus.CANCELLED,
      updatedBy: userId,
    });
    const savedOrder = await this.findOne(id);

    if (order.tableId) {
      await this.tableService.executeUpdate(
        order.tableId,
        { status: TableStatus.AVAILABLE },
        userId,
        true,
      );
    }

    return savedOrder;
  }

  async transferTable(
    id: number,
    targetTableId: number,
    userId: number,
  ): Promise<Order> {
    const order = await this.findOne(id);
    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new Error('Cannot transfer a completed or cancelled order');
    }

    const sourceTableId = order.tableId;
    if (sourceTableId === targetTableId) {
      throw new Error('Target table is the same as source table');
    }

    // Check if target table is available
    const targetTable = await this.tableService.findOne(targetTableId);
    if (targetTable.status !== TableStatus.AVAILABLE) {
      throw new Error('Target table is not available');
    }

    // Update order directly to avoid relation object overwriting the foreign key
    await this.orderRepository.update(id, {
      tableId: targetTableId,
      updatedBy: userId,
    });
    const updatedOrder = await this.findOne(id);

    // Update tables
    if (sourceTableId) {
      await this.tableService.executeUpdate(
        sourceTableId,
        { status: TableStatus.AVAILABLE },
        userId,
        true,
      );
    }

    await this.tableService.executeUpdate(
      targetTableId,
      { status: TableStatus.OCCUPIED },
      userId,
      true,
    );

    // Send notification
    void this.notificationService.sendNotification(
      NotificationType.ORDER_STATUS_UPDATED,
      'Chuyển bàn',
      `Đơn hàng ${order.orderNumber} đã được chuyển từ bàn #${sourceTableId} sang bàn #${targetTableId}`,
      { orderId: order.id, sourceTableId, targetTableId },
    );

    return updatedOrder;
  }

  async mergeOrder(
    sourceOrderId: number,
    targetTableId: number,
    userId: number,
  ): Promise<Order> {
    const sourceOrder = await this.findOne(sourceOrderId);
    const targetOrderBase = await this.findActiveByTable(targetTableId);

    if (!targetOrderBase) {
      throw new Error('Bàn đích không có đơn hàng hoạt động');
    }

    // Load full target order with items
    const targetOrder = await this.findOne(targetOrderBase.id);

    if (
      sourceOrder.status === OrderStatus.COMPLETED ||
      sourceOrder.status === OrderStatus.CANCELLED
    ) {
      throw new Error('Đơn hàng nguồn không khả dụng');
    }
    if (
      targetOrder.status === OrderStatus.COMPLETED ||
      targetOrder.status === OrderStatus.CANCELLED
    ) {
      throw new Error('Đơn hàng đích không khả dụng');
    }

    const sourceItems = sourceOrder.items || [];
    const targetItems = targetOrder.items || [];

    for (const sItem of sourceItems) {
      const existingInTarget = targetItems.find(
        (tItem) => tItem.product.id === sItem.product.id,
      );

      if (existingInTarget) {
        // Merge quantity
        existingInTarget.quantity =
          Number(existingInTarget.quantity) + Number(sItem.quantity);
        if (sItem.notes) {
          existingInTarget.notes = existingInTarget.notes
            ? `${existingInTarget.notes}; ${sItem.notes}`
            : sItem.notes;
        }
        await this.orderItemRepository.save(existingInTarget);
        // Remove item from source
        await this.orderItemRepository.remove(sItem);
      } else {
        // Just move the item to target order
        sItem.order = targetOrder;
        await this.orderItemRepository.save(sItem);
        targetItems.push(sItem);
      }
    }

    // Refresh target items to ensure we have correct data for total calculation
    const finalTargetItems = await this.orderItemRepository.find({
      where: { order: { id: targetOrder.id } },
    });

    // Recalculate target order total price
    const newTargetTotalPrice = finalTargetItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    await this.orderRepository.update(targetOrder.id, {
      totalPrice: newTargetTotalPrice,
      updatedBy: userId,
    });

    // Cancel source order and update notes
    const newSourceNotes =
      (sourceOrder.notes ? sourceOrder.notes + ' ' : '') +
      `(Đã gộp vào đơn ${targetOrder.orderNumber})`;

    await this.orderRepository.update(sourceOrderId, {
      status: OrderStatus.CANCELLED,
      notes: newSourceNotes,
      updatedBy: userId,
    });

    const savedTargetOrder = await this.findOne(targetOrder.id);

    // Update source table status to AVAILABLE
    if (sourceOrder.tableId) {
      await this.tableService.executeUpdate(
        sourceOrder.tableId,
        { status: TableStatus.AVAILABLE },
        userId,
        true,
      );
    }

    // Send notification
    void this.notificationService.sendNotification(
      NotificationType.ORDER_STATUS_UPDATED,
      'Gộp đơn hàng',
      `Đơn hàng ${sourceOrder.orderNumber} đã được gộp vào đơn hàng ${targetOrder.orderNumber}`,
      { sourceOrderId, targetOrderId: targetOrder.id },
    );

    return savedTargetOrder;
  }

  async removeItem(
    id: number,
    productId: number,
    userId: number,
  ): Promise<Order> {
    const order = await this.findOne(id);
    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new Error(
        'Cannot remove items from a completed or cancelled order',
      );
    }

    const orderItem = await this.orderItemRepository.findOne({
      where: {
        order: { id },
        product: { id: productId },
      },
    });

    if (!orderItem) {
      throw new Error('Item not found in order');
    }

    await this.orderItemRepository.remove(orderItem);

    // Refresh order items and recalculate total
    const refreshedOrder = await this.findOne(id);
    const newTotalPrice = (refreshedOrder.items || []).reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0,
    );

    // Update order with direct update
    await this.orderRepository.update(id, {
      totalPrice: newTotalPrice,
      updatedBy: userId,
    });

    const savedOrder = await this.findOne(id);

    // Send notification
    void this.notificationService.sendNotification(
      NotificationType.ORDER_STATUS_UPDATED,
      'Xoá món khỏi đơn',
      `Món ăn đã được xoá khỏi đơn hàng ${savedOrder.orderNumber}`,
      { orderId: savedOrder.id, productId },
    );

    return savedOrder;
  }
}
