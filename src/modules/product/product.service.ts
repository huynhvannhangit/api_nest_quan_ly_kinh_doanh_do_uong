import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductHistoryService } from './product-history.service';
import { UserService } from '../user/user.service';
import { ApprovalsService } from '../approval/approvals.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';
import { MESSAGES } from '../../common/constants/messages.constant';
import { OrderItem } from '../order/entities/order-item.entity';
import { OrderStatus } from '../order/entities/order.entity';
import { In } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/notification.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly historyService: ProductHistoryService,
    private readonly userService: UserService,
    private readonly approvalsService: ApprovalsService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(productData: Partial<Product>, userId?: number): Promise<any> {
    if (!userId) {
      return this.executeCreate(productData, userId);
    }

    const user = await this.userService.findById(userId);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeCreate(productData, userId);
    }

    return this.approvalsService.create(
      {
        type: ApprovalType.CREATE,
        targetModule: 'Sản phẩm',
        metadata: {
          serviceName: 'ProductService',
          methodName: 'executeCreate',
          args: [productData],
          newData: productData,
        },
        reason: `Tạo sản phẩm mới: ${productData.name}`,
      },
      userId,
    );
  }

  async executeCreate(
    productData: Partial<Product>,
    userId?: number,
    skipNotification = false,
  ): Promise<Product> {
    const product = this.productRepository.create(productData);
    if (userId) {
      product.createdBy = userId;
      product.updatedBy = userId;
    }
    const savedProduct = await this.productRepository.save(product);

    await this.historyService.createHistory({
      productId: savedProduct.id,
      changedBy: userId,
      newData: savedProduct,
      reason: 'Initial creation',
    });

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Sản phẩm mới',
        `Sản phẩm "${savedProduct.name}" đã được tạo mới.`,
        { type: 'PRODUCT', action: 'CREATE', id: savedProduct.id },
      );
    }

    return savedProduct;
  }

  async findAll(keyword?: string, page = 1, limit = 20) {
    const kw = keyword?.trim();
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.creator', 'creator')
      .leftJoinAndSelect('product.updater', 'updater')
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (kw) {
      queryBuilder.where('(product.name LIKE :kw OR category.name LIKE :kw)', {
        kw: `%${kw}%`,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

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

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'creator', 'updater'],
    });
    if (!product) throw new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND);
    return product;
  }

  async update(
    id: number,
    updateData: Partial<Product>,
    userId?: number,
    reason?: string,
  ): Promise<any> {
    if (!userId) {
      return this.executeUpdate(id, updateData, userId);
    }

    const user = await this.userService.findById(userId);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeUpdate(id, updateData, userId);
    }

    // Fetch current data to store as oldData
    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.UPDATE,
        targetModule: 'Sản phẩm',
        metadata: {
          serviceName: 'ProductService',
          methodName: 'executeUpdate',
          args: [id, updateData],
          oldData,
          newData: updateData,
        },
        reason: reason || `Cập nhật sản phẩm ID: ${id}`,
      },
      userId,
    );
  }

  async executeUpdate(
    id: number,
    updateData: Partial<Product>,
    userId?: number,
    skipNotification = false,
  ): Promise<Product> {
    const oldProduct = await this.findOne(id);
    const updatedProduct = await this.productRepository.save({
      ...oldProduct,
      ...updateData,
      updatedBy: userId,
    });

    await this.historyService.createHistory({
      productId: id,
      changedBy: userId,
      oldData: oldProduct,
      newData: updatedProduct,
      reason: 'Standard update',
    });

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Cập nhật sản phẩm',
        `Sản phẩm "${updatedProduct.name}" đã được cập nhật thông tin.`,
        { type: 'PRODUCT', action: 'UPDATE', id: updatedProduct.id },
      );
    }

    return updatedProduct;
  }

  async remove(id: number, userId?: number, reason?: string): Promise<any> {
    if (!userId) {
      return this.executeRemove(id, userId);
    }

    const user = await this.userService.findById(userId);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeRemove(id, userId);
    }

    // Fetch current data to store as oldData
    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Sản phẩm',
        metadata: {
          serviceName: 'ProductService',
          methodName: 'executeRemove',
          args: [id],
          oldData,
        },
        reason: reason || `Xoá sản phẩm ID: ${id}`,
      },
      userId,
    );
  }

  async executeRemove(
    id: number,
    userId?: number,
    skipNotification = false,
  ): Promise<void> {
    const product = await this.findOne(id);

    // Kiểm tra sản phẩm có trong đơn hàng chưa hoàn tất không
    const activeOrderItems = await this.orderItemRepository.count({
      where: {
        product: { id },
        order: {
          status: In([OrderStatus.PENDING, OrderStatus.PROCESSING]),
        },
      },
      relations: ['order'],
    });

    if (activeOrderItems > 0) {
      throw new BadRequestException(MESSAGES.PRODUCT_HAS_ACTIVE_ORDERS);
    }

    if (userId) {
      product.deletedBy = userId;
      await this.productRepository.save(product);
    }
    const removedProduct = await this.productRepository.softRemove(product);

    await this.historyService.createHistory({
      productId: id,
      changedBy: userId,
      oldData: product,
      reason: 'Soft delete',
    });

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa sản phẩm',
        `Sản phẩm "${removedProduct.name}" đã bị xóa khỏi hệ thống.`,
        { type: 'PRODUCT', action: 'DELETE', id: removedProduct.id },
      );
    }
  }

  async removeMany(
    ids: number[],
    userId?: number,
    reason?: string,
  ): Promise<any> {
    if (!userId) {
      return this.executeRemoveMany(ids, userId);
    }

    const user = await this.userService.findById(userId);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeRemoveMany(ids, userId);
    }

    const oldData = await this.productRepository.findByIds(ids);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Sản phẩm',
        metadata: {
          serviceName: 'ProductService',
          methodName: 'executeRemoveMany',
          args: [ids],
          oldData,
        },
        reason: reason || `Xoá hàng loạt ${ids.length} sản phẩm`,
      },
      userId,
    );
  }

  async executeRemoveMany(
    ids: number[],
    userId?: number,
    skipNotification = false,
  ): Promise<void> {
    const products = await this.productRepository.findByIds(ids);

    // Kiểm tra các sản phẩm có trong đơn hàng chưa hoàn tất không
    const activeOrderItems = await this.orderItemRepository.count({
      where: {
        product: { id: In(ids) },
        order: {
          status: In([OrderStatus.PENDING, OrderStatus.PROCESSING]),
        },
      },
      relations: ['order'],
    });

    if (activeOrderItems > 0) {
      throw new BadRequestException(MESSAGES.PRODUCT_HAS_ACTIVE_ORDERS);
    }

    for (const product of products) {
      if (userId) product.deletedBy = userId;
    }
    await this.productRepository.save(products);
    const removedProducts = await this.productRepository.softRemove(products);

    for (const product of products) {
      await this.historyService.createHistory({
        productId: product.id,
        changedBy: userId,
        oldData: product,
        reason: 'Bulk soft delete',
      });
    }

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa nhiều sản phẩm',
        `${removedProducts.length} sản phẩm đã bị xóa khỏi hệ thống.`,
        {
          type: 'PRODUCT',
          action: 'DELETE_MANY',
          ids: removedProducts.map((p) => p.id),
        },
      );
    }
  }
}
