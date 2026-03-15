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
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/notification.dto';
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
    private readonly notificationService: NotificationService,
  ) {}

  async create(data: CreateTableDto, createdBy: number): Promise<any> {
    const user = await this.userService.findById(createdBy);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeCreate(data, createdBy);
    }

    return this.approvalsService.create(
      {
        type: ApprovalType.CREATE,
        targetModule: 'Bàn',
        metadata: {
          serviceName: 'TableService',
          methodName: 'executeCreate',
          args: [data],
          newData: data,
        },
        reason: `Tạo bàn mới: ${data.tableNumber}`,
      },
      createdBy,
    );
  }

  async executeCreate(
    data: CreateTableDto,
    createdBy: number,
    skipNotification = false,
  ): Promise<Table> {
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
    const savedTable = await this.tableRepository.save(table);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Bàn mới',
        `Bàn "${savedTable.tableNumber}" đã được tạo mới.`,
        { type: 'TABLE', action: 'CREATE', id: savedTable.id },
      );
    }

    return savedTable;
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
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeUpdate(id, data, updatedBy);
    }

    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.UPDATE,
        targetModule: 'Bàn',
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
    skipNotification = false,
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
    const savedTable = await this.tableRepository.save(table);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Cập nhật bàn',
        `Bàn "${savedTable.tableNumber}" đã được cập nhật thông tin.`,
        { type: 'TABLE', action: 'UPDATE', id: savedTable.id },
      );
    }

    return savedTable;
  }

  async remove(id: number, deletedBy: number, reason?: string): Promise<any> {
    const user = await this.userService.findById(deletedBy);
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeRemove(id, deletedBy);
    }

    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Bàn',
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

  async executeRemove(
    id: number,
    deletedBy: number,
    skipNotification = false,
  ): Promise<void> {
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
    const removedTable = await this.tableRepository.softRemove(table);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa bàn',
        `Bàn "${removedTable.tableNumber}" đã bị xóa khỏi hệ thống.`,
        { type: 'TABLE', action: 'DELETE', id: removedTable.id },
      );
    }
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
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin) {
      return this.executeRemoveMany(ids, deletedBy);
    }

    const oldData = await this.tableRepository.findByIds(ids);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Bàn',
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

  async executeRemoveMany(
    ids: number[],
    deletedBy: number,
    skipNotification = false,
  ): Promise<void> {
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
    const removedTables = await this.tableRepository.softRemove(tables);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa nhiều bàn',
        `${removedTables.length} bàn đã bị xóa khỏi hệ thống.`,
        {
          type: 'TABLE',
          action: 'DELETE_MANY',
          ids: removedTables.map((t) => t.id),
        },
      );
    }
  }
}
