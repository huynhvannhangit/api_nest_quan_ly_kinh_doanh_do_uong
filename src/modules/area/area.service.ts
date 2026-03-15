import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository, Not, In } from 'typeorm';
import { Area } from './entities/area.entity';
import { Table, TableStatus } from '../table/entities/table.entity';
import { UserService } from '../user/user.service';
import { ApprovalsService } from '../approval/approvals.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';
import { MESSAGES } from '../../common/constants/messages.constant';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/notification.dto';

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvalsService: ApprovalsService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(data: CreateAreaDto, createdBy: number): Promise<any> {
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
        targetModule: 'Khu vực',
        metadata: {
          serviceName: 'AreaService',
          methodName: 'executeCreate',
          args: [data],
          newData: data,
        },
        reason: `Tạo khu vực mới: ${data.name}`,
      },
      createdBy,
    );
  }

  async executeCreate(
    data: CreateAreaDto,
    createdBy: number,
    skipNotification = false,
  ): Promise<Area> {
    const existingArea = await this.areaRepository.findOne({
      where: { name: data.name },
    });
    if (existingArea) {
      throw new ConflictException(MESSAGES.AREA_NAME_EXISTS);
    }

    const area = new Area();
    Object.assign(area, data);
    area.createdBy = createdBy;
    area.updatedBy = createdBy;
    const savedArea = await this.areaRepository.save(area);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Khu vực mới',
        `Khu vực "${savedArea.name}" đã được tạo mới.`,
        { type: 'AREA', action: 'CREATE', id: savedArea.id },
      );
    }

    return savedArea;
  }

  async findAll(keyword?: string): Promise<Area[]> {
    const kw = keyword?.trim();
    return this.areaRepository.find({
      where: kw ? { name: ILike(`%${kw}%`) } : undefined,
      relations: ['tables', 'creator', 'updater'],
    });
  }

  async findOne(id: number): Promise<Area> {
    const area = await this.areaRepository.findOne({
      where: { id },
      relations: ['tables', 'creator', 'updater'],
    });
    if (!area) {
      throw new NotFoundException(MESSAGES.AREA_NOT_FOUND);
    }
    return area;
  }

  async update(
    id: number,
    data: UpdateAreaDto,
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
        targetModule: 'Khu vực',
        metadata: {
          serviceName: 'AreaService',
          methodName: 'executeUpdate',
          args: [id, data],
          oldData,

          newData: data,
        },
        reason: reason || `Cập nhật khu vực ID: ${id}`,
      },
      updatedBy,
    );
  }

  async executeUpdate(
    id: number,
    data: UpdateAreaDto,
    updatedBy: number,
    skipNotification = false,
  ): Promise<Area> {
    if (data.name) {
      const existingArea = await this.areaRepository.findOne({
        where: {
          name: data.name,
          id: Not(id),
        },
      });
      if (existingArea) {
        throw new ConflictException(MESSAGES.AREA_NAME_EXISTS);
      }
    }

    const area = await this.findOne(id);
    Object.assign(area, data);
    area.updatedBy = updatedBy;
    const savedArea = await this.areaRepository.save(area);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Cập nhật khu vực',
        `Khu vực "${savedArea.name}" đã được cập nhật thông tin.`,
        { type: 'AREA', action: 'UPDATE', id: savedArea.id },
      );
    }

    return savedArea;
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
        targetModule: 'Khu vực',
        metadata: {
          serviceName: 'AreaService',
          methodName: 'executeRemove',
          args: [id],
          oldData,
        },
        reason: reason || `Xoá khu vực ID: ${id}`,
      },
      deletedBy,
    );
  }

  async executeRemove(
    id: number,
    deletedBy: number,
    skipNotification = false,
  ): Promise<void> {
    const area = await this.findOne(id);

    const activeTables = await this.tableRepository.count({
      where: {
        areaId: id,
        status: TableStatus.OCCUPIED,
      },
    });

    if (activeTables > 0) {
      throw new BadRequestException(MESSAGES.AREA_HAS_ACTIVE_TABLES);
    }

    await this.tableRepository.update(
      { areaId: id },
      { status: TableStatus.MAINTENANCE },
    );

    area.deletedBy = deletedBy;
    await this.areaRepository.save(area);
    const removedArea = await this.areaRepository.softRemove(area);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa khu vực',
        `Khu vực "${removedArea.name}" đã bị xóa khỏi hệ thống.`,
        { type: 'AREA', action: 'DELETE', id: removedArea.id },
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

    const oldData = await this.areaRepository.findByIds(ids);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Khu vực',
        metadata: {
          serviceName: 'AreaService',
          methodName: 'executeRemoveMany',
          args: [ids],
          oldData,
        },
        reason: reason || `Xoá hàng loạt ${ids.length} khu vực`,
      },
      deletedBy,
    );
  }

  async executeRemoveMany(
    ids: number[],
    deletedBy: number,
    skipNotification = false,
  ): Promise<void> {
    const areas = await this.areaRepository.findByIds(ids);

    const activeTables = await this.tableRepository.count({
      where: {
        areaId: In(ids),
        status: TableStatus.OCCUPIED,
      },
    });

    if (activeTables > 0) {
      throw new BadRequestException(MESSAGES.AREA_HAS_ACTIVE_TABLES);
    }

    await this.tableRepository.update(
      { areaId: In(ids) },
      { status: TableStatus.MAINTENANCE },
    );

    for (const area of areas) {
      area.deletedBy = deletedBy;
    }
    await this.areaRepository.save(areas);
    const removedAreas = await this.areaRepository.softRemove(areas);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa nhiều khu vực',
        `${removedAreas.length} khu vực đã bị xóa khỏi hệ thống.`,
        {
          type: 'AREA',
          action: 'DELETE_MANY',
          ids: removedAreas.map((a) => a.id),
        },
      );
    }
  }
}
