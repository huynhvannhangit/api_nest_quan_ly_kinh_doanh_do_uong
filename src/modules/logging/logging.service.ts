import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLog } from './entities/user-log.entity';
import { QueryLogDto } from './dto/query-log.dto';

@Injectable()
export class LoggingService {
  constructor(
    @InjectRepository(UserLog)
    private readonly userLogRepository: Repository<UserLog>,
  ) {}

  async logAction(data: {
    userId?: number;
    action: string;
    module?: string;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    const userLog = this.userLogRepository.create(data);
    await this.userLogRepository.save(userLog);
  }

  async findAll(
    query: QueryLogDto,
  ): Promise<{ data: UserLog[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { module, action, userId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (module) {
      queryBuilder.andWhere('log.module = :module', { module });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }
}
