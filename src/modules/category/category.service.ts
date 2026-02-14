import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(data: Partial<Category>, createdBy: number): Promise<Category> {
    const category = this.categoryRepository.create(data);
    category.createdBy = createdBy;
    category.updatedBy = createdBy;
    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findOne(id: number): Promise<Category | null> {
    return this.categoryRepository.findOne({ where: { id } });
  }

  async update(
    id: number,
    data: Partial<Category>,
    updatedBy: number,
  ): Promise<Category | null> {
    await this.categoryRepository.update(id, { ...data, updatedBy });
    return this.findOne(id);
  }

  async remove(id: number, deletedBy: number): Promise<void> {
    await this.categoryRepository.update(id, { deletedBy });
    await this.categoryRepository.softRemove({ id } as any);
  }
}
