import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductHistoryService } from './product-history.service';
import { UserService } from '../user/user.service';
import { ApprovalsService } from '../approval/approvals.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly historyService: ProductHistoryService,
    private readonly userService: UserService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  async create(
    productData: Partial<Product>,
    userId?: number,
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

    return savedProduct;
  }

  async findAll(keyword?: string): Promise<Product[]> {
    const kw = keyword?.trim();
    if (!kw) {
      return this.productRepository.find({
        relations: ['category', 'creator', 'updater'],
      });
    }
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.creator', 'creator')
      .leftJoinAndSelect('product.updater', 'updater')
      .where('product.name LIKE :kw', { kw: `%${kw}%` })
      .orWhere('category.name LIKE :kw', { kw: `%${kw}%` })
      .getMany();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'creator', 'updater'],
    });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
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
    const isAdmin = roleName === 'ADMIN';

    if (isAdmin) {
      return this.executeUpdate(id, updateData, userId);
    }

    // Fetch current data to store as oldData
    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.UPDATE,
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
    const isAdmin = roleName === 'ADMIN';

    if (isAdmin) {
      return this.executeRemove(id, userId);
    }

    // Fetch current data to store as oldData
    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
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

  async executeRemove(id: number, userId?: number): Promise<void> {
    const product = await this.findOne(id);
    if (userId) {
      product.deletedBy = userId;
      await this.productRepository.save(product);
    }
    await this.productRepository.softRemove(product);

    await this.historyService.createHistory({
      productId: id,
      changedBy: userId,
      oldData: product,
      reason: 'Soft delete',
    });
  }
}
