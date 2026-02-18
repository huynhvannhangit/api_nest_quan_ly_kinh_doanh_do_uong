import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './entities/table.entity';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  async create(data: any, createdBy: number): Promise<Table> {
    const table = new Table();
    Object.assign(table, data);
    table.createdBy = createdBy;
    table.updatedBy = createdBy;
    return this.tableRepository.save(table);
  }

  async findAll(): Promise<Table[]> {
    return this.tableRepository.find({
      relations: ['area', 'creator', 'updater'],
    });
  }

  async findOne(id: number): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id },
      relations: ['area', 'creator', 'updater'],
    });
    if (!table) {
      throw new NotFoundException(`Table with ID ${id} not found`);
    }
    return table;
  }

  async update(id: number, data: any, updatedBy: number): Promise<Table> {
    const table = await this.findOne(id);
    Object.assign(table, data);
    table.updatedBy = updatedBy;
    return this.tableRepository.save(table);
  }

  async remove(id: number, deletedBy: number): Promise<void> {
    const table = await this.findOne(id);
    table.deletedBy = deletedBy;
    await this.tableRepository.save(table);
    await this.tableRepository.softRemove(table);
  }
}
