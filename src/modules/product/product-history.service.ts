import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductHistory } from './entities/product-history.entity';

@Injectable()
export class ProductHistoryService {
  constructor(
    @InjectRepository(ProductHistory)
    private readonly historyRepository: Repository<ProductHistory>,
  ) {}

  async createHistory(data: {
    productId: number;
    changedBy?: number;
    oldData?: any;
    newData?: any;
    reason?: string;
  }): Promise<void> {
    const history = this.historyRepository.create(data);
    await this.historyRepository.save(history);
  }
}
