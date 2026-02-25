import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './entities/table.entity';
import { UserService } from '../user/user.service';
import { ApprovalsService } from '../approval/approvals.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    private readonly userService: UserService,
    private readonly approvalsService: ApprovalsService,
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

  async update(
    id: number,
    data: any,
    updatedBy: number,
    reason?: string,
  ): Promise<any> {
    const user = await this.userService.findById(updatedBy);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN';

    if (isAdmin) {
      return this.executeUpdate(id, data, updatedBy);
    }

    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.UPDATE,
        metadata: {
          serviceName: 'TableService',
          methodName: 'executeUpdate',
          args: [id, data],
          oldData,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          newData: data,
        },
        reason: reason || `Cập nhật bàn ID: ${id}`,
      },
      updatedBy,
    );
  }

  async executeUpdate(
    id: number,
    data: any,
    updatedBy: number,
  ): Promise<Table> {
    const table = await this.findOne(id);
    Object.assign(table, data);
    table.updatedBy = updatedBy;
    return this.tableRepository.save(table);
  }

  async remove(id: number, deletedBy: number, reason?: string): Promise<any> {
    const user = await this.userService.findById(deletedBy);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN';

    if (isAdmin) {
      return this.executeRemove(id, deletedBy);
    }

    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        metadata: {
          serviceName: 'TableService',
          methodName: 'executeRemove',
          args: [id],
          oldData,
        },
        reason: reason || `Xoá bàn ID: ${id}`,
      },
      deletedBy,
    );
  }

  async executeRemove(id: number, deletedBy: number): Promise<void> {
    const table = await this.findOne(id);
    table.deletedBy = deletedBy;
    await this.tableRepository.save(table);
    await this.tableRepository.softRemove(table);
  }
}
