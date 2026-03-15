import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Product } from '../product/entities/product.entity';
import { ILike, In } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { MESSAGES } from '../../common/constants/messages.constant';
import { UserService } from '../user/user.service';
import { ApprovalsService } from '../approval/approvals.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/notification.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvalsService: ApprovalsService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(data: Partial<Category>, createdBy: number): Promise<any> {
    const user = await this.userService.findById(createdBy);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeCreate(data, createdBy);
    }

    return this.approvalsService.create(
      {
        type: ApprovalType.CREATE,
        targetModule: 'Danh mục',
        metadata: {
          serviceName: 'CategoryService',
          methodName: 'executeCreate',
          args: [data],
          newData: data,
        },
        reason: `Tạo danh mục mới: ${data.name}`,
      },
      createdBy,
    );
  }

  async executeCreate(
    data: Partial<Category>,
    createdBy: number,
    skipNotification = false,
  ): Promise<Category> {
    const category = this.categoryRepository.create(data);
    category.createdBy = createdBy;
    category.updatedBy = createdBy;
    const savedCategory = await this.categoryRepository.save(category);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Danh mục mới',
        `Danh mục "${savedCategory.name}" đã được tạo mới.`,
        { type: 'CATEGORY', action: 'CREATE', id: savedCategory.id },
      );
    }

    return savedCategory;
  }

  async findAll(keyword?: string): Promise<Category[]> {
    const kw = keyword?.trim();
    const where = kw ? { name: ILike(`%${kw}%`) } : {};
    return this.categoryRepository.find({
      where,
      relations: ['creator', 'updater'],
    });
  }

  async findOne(id: number): Promise<Category | null> {
    return this.categoryRepository.findOne({
      where: { id },
      relations: ['creator', 'updater'],
    });
  }

  async update(
    id: number,
    data: Partial<Category>,
    updatedBy: number,
    reason?: string,
  ): Promise<any> {
    const user = await this.userService.findById(updatedBy);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeUpdate(id, data, updatedBy);
    }

    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.UPDATE,
        targetModule: 'Danh mục',
        metadata: {
          serviceName: 'CategoryService',
          methodName: 'executeUpdate',
          args: [id, data],
          oldData,
          newData: data,
        },
        reason: reason || `Cập nhật danh mục ID: ${id}`,
      },
      updatedBy,
    );
  }

  async executeUpdate(
    id: number,
    data: Partial<Category>,
    updatedBy: number,
    skipNotification = false,
  ): Promise<Category | null> {
    await this.categoryRepository.update(id, { ...data, updatedBy });
    const category = await this.findOne(id);

    // Broadcast notification
    if (category && !skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Cập nhật danh mục',
        `Danh mục "${category.name}" đã được cập nhật thông tin.`,
        { type: 'CATEGORY', action: 'UPDATE', id: category.id },
      );
    }

    return category;
  }

  async remove(id: number, deletedBy: number, reason?: string): Promise<any> {
    const user = await this.userService.findById(deletedBy);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeRemove(id, deletedBy);
    }

    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Danh mục',
        metadata: {
          serviceName: 'CategoryService',
          methodName: 'executeRemove',
          args: [id],
          oldData,
        },
        reason: reason || `Xoá danh mục ID: ${id}`,
      },
      deletedBy,
    );
  }
  async executeRemove(
    id: number,
    deletedBy: number,
    skipNotification = false,
  ): Promise<void> {
    const productsCount = await this.productRepository.count({
      where: { categoryId: id },
    });
    if (productsCount > 0) {
      throw new BadRequestException(MESSAGES.CATEGORY_HAS_PRODUCTS);
    }
    const category = await this.findOne(id);
    if (!category) {
      throw new BadRequestException(MESSAGES.CATEGORY_NOT_FOUND);
    }
    await this.categoryRepository.update(id, { deletedBy });
    const removedCategory = await this.categoryRepository.softRemove(category);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa danh mục',
        `Danh mục "${category?.name || 'N/A'}" đã bị xóa khỏi hệ thống.`,
        { type: 'CATEGORY', action: 'DELETE', id: removedCategory.id },
      );
    }
  }

  async removeMany(
    ids: number[],
    deletedBy: number,
    reason?: string,
  ): Promise<any> {
    const user = await this.userService.findById(deletedBy);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeRemoveMany(ids, deletedBy);
    }

    const oldData = await this.categoryRepository.findByIds(ids);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Danh mục',
        metadata: {
          serviceName: 'CategoryService',
          methodName: 'executeRemoveMany',
          args: [ids],
          oldData,
        },
        reason: reason || `Xoá hàng loạt ${ids.length} danh mục`,
      },
      deletedBy,
    );
  }

  async executeRemoveMany(
    ids: number[],
    deletedBy: number,
    skipNotification = false,
  ): Promise<void> {
    const productsCount = await this.productRepository.count({
      where: { categoryId: In(ids) },
    });
    if (productsCount > 0) {
      throw new BadRequestException(MESSAGES.CATEGORY_HAS_PRODUCTS);
    }
    await this.categoryRepository.update(ids, { deletedBy });
    const categories = await this.categoryRepository.find({
      where: { id: In(ids) },
    });
    const removedCategories =
      await this.categoryRepository.softRemove(categories);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa nhiều danh mục',
        `${removedCategories.length} danh mục đã bị xóa khỏi hệ thống.`,
        {
          type: 'CATEGORY',
          action: 'DELETE_MANY',
          ids: removedCategories.map((c) => c.id),
        },
      );
    }
  }
}
