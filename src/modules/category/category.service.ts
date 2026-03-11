import { Injectable } from '@nestjs/common';
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

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly userService: UserService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  async create(
    data: Partial<Category>,
    createdBy: number,
    reason?: string,
  ): Promise<any> {
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
        reason: reason || `Tạo danh mục mới: ${data.name}`,
      },
      createdBy,
    );
  }

  async executeCreate(
    data: Partial<Category>,
    createdBy: number,
  ): Promise<Category> {
    const category = this.categoryRepository.create(data);
    category.createdBy = createdBy;
    category.updatedBy = createdBy;
    return this.categoryRepository.save(category);
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
  ): Promise<Category | null> {
    await this.categoryRepository.update(id, { ...data, updatedBy });
    return this.findOne(id);
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

  async executeRemove(id: number, deletedBy: number): Promise<void> {
    const productsCount = await this.productRepository.count({
      where: { categoryId: id },
    });
    if (productsCount > 0) {
      throw new BadRequestException(MESSAGES.CATEGORY_HAS_PRODUCTS);
    }
    await this.categoryRepository.update(id, { deletedBy });
    await this.categoryRepository.softRemove({ id } as any);
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

  async executeRemoveMany(ids: number[], deletedBy: number): Promise<void> {
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
    await this.categoryRepository.softRemove(categories);
  }
}
