import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
  ) {}

  async get(): Promise<SystemConfig> {
    let config = await this.systemConfigRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!config) {
      config = this.systemConfigRepository.create({
        systemName: 'Quản lý kinh doanh Đồ Uống',
      });
      await this.systemConfigRepository.save(config);
    }

    return config;
  }

  async update(
    updateDto: UpdateSystemConfigDto,
    userId?: number,
  ): Promise<SystemConfig> {
    const config = await this.get();
    Object.assign(config, updateDto);
    if (userId) {
      config.updatedBy = userId;
      if (!config.createdBy) {
        config.createdBy = userId;
      }
    }
    return await this.systemConfigRepository.save(config);
  }
}
