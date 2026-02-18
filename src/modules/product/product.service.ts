import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductHistoryService } from './product-history.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly historyService: ProductHistoryService,
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

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      relations: ['category', 'creator', 'updater'],
    });
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

  async remove(id: number, userId?: number): Promise<void> {
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
