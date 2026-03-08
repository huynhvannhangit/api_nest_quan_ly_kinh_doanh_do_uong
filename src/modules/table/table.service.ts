import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Table } from './entities/table.entity';
import { UserService } from '../user/user.service';
import { ApprovalsService } from '../approval/approvals.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';
import { MESSAGES } from '../../common/constants/messages.constant';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { In } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly userService: UserService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  async create(data: CreateTableDto, createdBy: number): Promise<Table> {
    const existingTable = await this.tableRepository.findOne({
      where: { tableNumber: data.tableNumber },
    });
    if (existingTable) {
      throw new ConflictException(MESSAGES.TABLE_NUMBER_EXISTS);
    }

    const table = new Table();
    Object.assign(table, data);
    table.createdBy = createdBy;
    table.updatedBy = createdBy;
    return this.tableRepository.save(table);
  }

  async findAll(keyword?: string): Promise<Table[]> {
    const kw = keyword?.trim();
    if (!kw) {
      return this.tableRepository.find({
        relations: ['area', 'creator', 'updater'],
      });
    }
    return this.tableRepository
      .createQueryBuilder('table')
      .leftJoinAndSelect('table.area', 'area')
      .leftJoinAndSelect('table.creator', 'creator')
      .leftJoinAndSelect('table.updater', 'updater')
      .where('table.tableNumber LIKE :kw', { kw: `%${kw}%` })
      .orWhere('area.name LIKE :kw', { kw: `%${kw}%` })
      .getMany();
  }

  async findOne(id: number): Promise<Table> {
    const table = await this.tableRepository.findOne({
      where: { id },
      relations: ['area', 'creator', 'updater'],
    });
    if (!table) {
      throw new NotFoundException(MESSAGES.TABLE_NOT_FOUND);
    }
    return table;
  }

  async update(
    id: number,
    data: UpdateTableDto,
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

          newData: data,
        },
        reason: reason || `Cập nhật bàn ID: ${id}`,
      },
      updatedBy,
    );
  }

  async executeUpdate(
    id: number,
    data: UpdateTableDto,
    updatedBy: number,
  ): Promise<Table> {
    if (data.tableNumber) {
      const existingTable = await this.tableRepository.findOne({
        where: {
          tableNumber: data.tableNumber,
          id: Not(id),
        },
      });
      if (existingTable) {
        throw new ConflictException(MESSAGES.TABLE_NUMBER_EXISTS);
      }
    }

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

    // Kiểm tra bàn có đơn hàng chưa hoàn tất không
    const activeOrders = await this.orderRepository.count({
      where: {
        table: { id },
        status: In([OrderStatus.PENDING, OrderStatus.PROCESSING]),
      },
    });

    if (activeOrders > 0) {
      throw new BadRequestException(MESSAGES.TABLE_HAS_ACTIVE_ORDERS);
    }

    table.deletedBy = deletedBy;
    await this.tableRepository.save(table);
    await this.tableRepository.softRemove(table);
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
    const isAdmin = roleName === 'ADMIN';

    if (isAdmin) {
      return this.executeRemoveMany(ids, deletedBy);
    }

    const oldData = await this.tableRepository.findByIds(ids);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        metadata: {
          serviceName: 'TableService',
          methodName: 'executeRemoveMany',
          args: [ids],
          oldData,
        },
        reason: reason || `Xoá hàng loạt ${ids.length} bàn`,
      },
      deletedBy,
    );
  }

  async executeRemoveMany(ids: number[], deletedBy: number): Promise<void> {
    const tables = await this.tableRepository.findByIds(ids);

    // Kiểm tra xem có bàn nào đang có đơn hàng chưa hoàn tất không
    const activeOrders = await this.orderRepository.count({
      where: {
        table: { id: In(ids) },
        status: In([OrderStatus.PENDING, OrderStatus.PROCESSING]),
      },
    });

    if (activeOrders > 0) {
      throw new BadRequestException(MESSAGES.TABLE_HAS_ACTIVE_ORDERS);
    }

    for (const table of tables) {
      table.deletedBy = deletedBy;
    }
    await this.tableRepository.save(tables);
    await this.tableRepository.softRemove(tables);
  }
}
