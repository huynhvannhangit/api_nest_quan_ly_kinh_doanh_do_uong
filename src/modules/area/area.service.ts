import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { UserService } from '../user/user.service';
import { ApprovalsService } from '../approval/approvals.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    private readonly userService: UserService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  async create(data: any, createdBy: number): Promise<Area> {
    const area = new Area();
    Object.assign(area, data);
    area.createdBy = createdBy;
    area.updatedBy = createdBy;
    return this.areaRepository.save(area);
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
      throw new NotFoundException(`Area with ID ${id} not found`);
    }
    return area;
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
          serviceName: 'AreaService',
          methodName: 'executeUpdate',
          args: [id, data],
          oldData,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          newData: data,
        },
        reason: reason || `Cập nhật khu vực ID: ${id}`,
      },
      updatedBy,
    );
  }

  async executeUpdate(id: number, data: any, updatedBy: number): Promise<Area> {
    const area = await this.findOne(id);
    Object.assign(area, data);
    area.updatedBy = updatedBy;
    return this.areaRepository.save(area);
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

  async executeRemove(id: number, deletedBy: number): Promise<void> {
    const area = await this.findOne(id);
    area.deletedBy = deletedBy;
    await this.areaRepository.save(area);
    await this.areaRepository.softRemove(area);
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

    const oldData = await this.areaRepository.findByIds(ids);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
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

  async executeRemoveMany(ids: number[], deletedBy: number): Promise<void> {
    const areas = await this.areaRepository.findByIds(ids);
    for (const area of areas) {
      area.deletedBy = deletedBy;
    }
    await this.areaRepository.save(areas);
    await this.areaRepository.softRemove(areas);
  }
}
