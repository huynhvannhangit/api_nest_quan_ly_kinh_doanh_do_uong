import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  async create(data: any, createdBy: number): Promise<Area> {
    const area = new Area();
    Object.assign(area, data);
    area.createdBy = createdBy;
    area.updatedBy = createdBy;
    return this.areaRepository.save(area);
  }

  async findAll(): Promise<Area[]> {
    return this.areaRepository.find({
      relations: ['tables', 'creator', 'updater'],
    });
  }

  async findOne(id: number): Promise<Area> {
    const area = await this.areaRepository.findOne({
      where: { id },
      relations: ['tables', 'creator', 'updater'],
    });
    if (!area) {
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return area;
  }

  async update(id: number, data: any, updatedBy: number): Promise<Area> {
    const area = await this.findOne(id);
    Object.assign(area, data);
    area.updatedBy = updatedBy;
    return this.areaRepository.save(area);
  }

  async remove(id: number, deletedBy: number): Promise<void> {
    const area = await this.findOne(id);
    area.deletedBy = deletedBy;
    await this.areaRepository.save(area);
    await this.areaRepository.softRemove(area);
  }
}
