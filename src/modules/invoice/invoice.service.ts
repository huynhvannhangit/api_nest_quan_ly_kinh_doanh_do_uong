import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Invoice,
  InvoiceStatus,
  PaymentMethod,
} from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { TableService } from '../table/table.service';
import { TableStatus } from '../table/entities/table.entity';
import { OrderService } from '../order/order.service';
import { OrderStatus } from '../order/entities/order.entity';
import { ApprovalsService } from '../approval/approvals.service';
import { UserService } from '../user/user.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    private readonly tableService: TableService,
    private readonly orderService: OrderService,
    private readonly approvalsService: ApprovalsService,
    private readonly userService: UserService,
  ) {}

  async create(data: Partial<Invoice>, createdBy: number): Promise<Invoice> {
    const invoiceNumber = `HD-${Date.now()}`;
    const invoice = new Invoice();
    invoice.invoiceNumber = invoiceNumber;
    invoice.createdBy = createdBy;
    invoice.updatedBy = createdBy;
    invoice.status = InvoiceStatus.PENDING;

    if (data.orderId) {
      console.log(
        `[InvoiceService] Checking if invoice exists for orderId: ${data.orderId}`,
      );
      // Check if an invoice already exists for this order
      const existingInvoice = await this.invoiceRepository.findOne({
        where: { orderId: data.orderId },
        relations: ['items', 'items.product', 'table', 'creator'],
      });

      if (existingInvoice) {
        console.log(
          `[InvoiceService] Found existing invoice with status: ${existingInvoice.status}`,
        );
        // Option 1: Just return the existing invoice (assuming it's pending)
        // Optionally update the discount if it changed, but usually, we just return it
        if (
          existingInvoice.status === InvoiceStatus.PENDING &&
          data.discountPercent !== undefined &&
          data.discountPercent !== existingInvoice.discountPercent
        ) {
          console.log(
            `[InvoiceService] Updating discount for existing invoice: ${data.discountPercent}`,
          );
          existingInvoice.discountPercent = data.discountPercent;
          existingInvoice.discountAmount =
            (existingInvoice.subtotal * existingInvoice.discountPercent) / 100;
          existingInvoice.total =
            existingInvoice.subtotal - existingInvoice.discountAmount;
          return this.invoiceRepository.save(existingInvoice);
        }
        return existingInvoice;
      }

      console.log(
        `[InvoiceService] No existing invoice found. Creating new one for orderId: ${data.orderId}`,
      );

      const order = await this.orderService.findOne(data.orderId);
      invoice.orderId = data.orderId;
      invoice.table = order.table || null;
      invoice.subtotal = Number(order.totalPrice);

      // Handle discount if provided
      invoice.discountPercent = data.discountPercent || 0;
      invoice.discountAmount =
        (invoice.subtotal * invoice.discountPercent) / 100;
      invoice.total = invoice.subtotal - invoice.discountAmount;

      if (order.items && order.items.length > 0) {
        invoice.items = order.items.map((orderItem) => {
          const item = new InvoiceItem();
          item.product = orderItem.product;
          item.price = orderItem.price;
          item.quantity = orderItem.quantity;
          item.total = Number(orderItem.price) * Number(orderItem.quantity);
          item.note = orderItem.notes;
          return item;
        });
      }
    } else {
      // Fallback for direct invoice creation if needed
      Object.assign(invoice, data);
    }

    return this.invoiceRepository.save(invoice);
  }

  async findAll(keyword?: string): Promise<Invoice[]> {
    const kw = keyword?.trim();
    if (!kw) {
      return this.invoiceRepository.find({
        relations: ['items', 'items.product', 'table', 'creator'],
        order: { createdAt: 'DESC' },
      });
    }
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('invoice.table', 'table')
      .leftJoinAndSelect('invoice.creator', 'creator')
      .where('invoice.invoiceNumber LIKE :kw', { kw: `%${kw}%` })
      .orderBy('invoice.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'table', 'creator', 'order'],
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  async update(
    id: number,
    data: Partial<Invoice>,
    updatedBy: number,
  ): Promise<Invoice> {
    await this.findOne(id);
    await this.invoiceRepository.update(id, { ...data, updatedBy });
    return this.findOne(id);
  }

  async processPayment(
    id: number,
    data: { paymentMethod: PaymentMethod },
    updatedBy: number,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    // Update invoice
    invoice.status = InvoiceStatus.PAID;
    invoice.paymentMethod = data.paymentMethod;
    invoice.paidAt = new Date();
    invoice.updatedBy = updatedBy;

    await this.invoiceRepository.save(invoice);

    // Update associated order if exists
    if (invoice.orderId) {
      await this.orderService.updateStatus(
        invoice.orderId,
        OrderStatus.COMPLETED,
        updatedBy,
      );
    }

    // Update associated table if exists
    if (invoice.table?.id) {
      await this.tableService.executeUpdate(
        invoice.table.id,
        { status: TableStatus.AVAILABLE },
        updatedBy,
      );
    } else if (invoice.order?.tableId) {
      await this.tableService.executeUpdate(
        invoice.order.tableId,
        { status: TableStatus.AVAILABLE },
        updatedBy,
      );
    }

    // Reload invoice with all relations for the frontend
    return this.findOne(id);
  }

  async remove(id: number, userId: number, reason?: string): Promise<any> {
    const user = await this.userService.findById(userId);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN';

    if (isAdmin) {
      return this.executeRemove(id, userId);
    }

    const oldData = await this.findOne(id);

    // Create approval request for soft delete
    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        metadata: {
          serviceName: 'InvoiceService',
          methodName: 'executeRemove',
          args: [id],
          oldData,
        },
        reason: reason || 'Yêu cầu xoá hoá đơn',
      },
      userId,
    );
  }

  async executeRemove(id: number, deletedBy: number): Promise<void> {
    const invoice = await this.findOne(id);
    invoice.deletedBy = deletedBy;
    await this.invoiceRepository.save(invoice);
    await this.invoiceRepository.softRemove(invoice);
  }
}
