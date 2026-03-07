import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { UserStatus } from '../user/entities/user.entity';
import { Employee, EmployeeStatus } from './entities/employee.entity';
import { User } from '../user/entities/user.entity';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UserService } from '../user/user.service';
import { ApprovalsService } from '../approval/approvals.service';
import { ApprovalType } from '../approval/entities/approval-request.entity';
import { MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userService: UserService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  private async generateEmployeeCode(): Promise<string> {
    // Find the latest employee by ID to get the next number
    const lastEmployees = await this.employeeRepository.find({
      order: { id: 'DESC' },
      withDeleted: true, // Include soft-deleted to avoid code conflicts
      take: 1,
    });
    const lastEmployee = lastEmployees[0];

    let nextNumber = 1;
    if (lastEmployee && lastEmployee.employeeCode) {
      // Extract number from code like "NV001" -> 1
      const match = lastEmployee.employeeCode.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Format as NV001, NV002, etc.
    return `NV${nextNumber.toString().padStart(3, '0')}`;
  }

  async create(data: CreateEmployeeDto, createdBy: number): Promise<Employee> {
    try {
      console.log('=== Creating Employee ===');
      console.log('Input data:', JSON.stringify(data, null, 2));
      console.log('Created by user ID:', createdBy);

      // Validate userId uniqueness: 1 user chỉ được liên kết với 1 nhân viên
      if (data.userId) {
        const existingEmployeeWithUser = await this.employeeRepository.findOne({
          where: { userId: data.userId },
        });
        if (existingEmployeeWithUser) {
          throw new BadRequestException(
            'Tài khoản này đã được liên kết với nhân viên khác',
          );
        }
      }

      const employee = new Employee();

      // Assign data first (excluding employeeCode)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { employeeCode: _employeeCode, ...employeeData } = data;
      Object.assign(employee, employeeData);

      console.log('Employee after data assignment:', employee);

      // Auto-generate employee code (this ensures it won't be overwritten)
      employee.employeeCode = await this.generateEmployeeCode();

      console.log('Generated employee code:', employee.employeeCode);

      employee.createdBy = createdBy;
      employee.updatedBy = createdBy;

      console.log('Employee before save:', employee);

      this.validateAge(employeeData.birthDate);

      const result = await this.employeeRepository.save(employee);
      console.log('Employee created successfully with ID:', result.id);
      return result;
    } catch (error) {
      console.error('=== Error Creating Employee ===');

      console.error('Error message:', (error as Error).message);

      console.error('Error stack:', (error as Error).stack);
      console.error('Error details:', error);
      throw error;
    }
  }

  private validateAge(birthDateString: string | Date | undefined) {
    if (!birthDateString) return;
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      throw new BadRequestException(MESSAGES.EMPLOYEE_AGE_INVALID);
    }
  }

  async findAll(keyword?: string): Promise<Employee[]> {
    const kw = keyword?.trim();
    if (!kw) {
      return this.employeeRepository.find({
        relations: ['user'],
      });
    }
    return this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .where('employee.fullName LIKE :kw', { kw: `%${kw}%` })
      .orWhere('employee.phone LIKE :kw', { kw: `%${kw}%` })
      .getMany();
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!employee) {
      throw new NotFoundException(MESSAGES.EMPLOYEE_NOT_FOUND);
    }
    return employee;
  }

  async update(
    id: number,
    data: UpdateEmployeeDto,
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
          serviceName: 'EmployeeService',
          methodName: 'executeUpdate',
          args: [id, data],
          oldData,
          newData: data,
        },
        reason: reason || `Cập nhật thông tin nhân viên ID: ${id}`,
      },
      updatedBy,
    );
  }

  async executeUpdate(
    id: number,
    data: UpdateEmployeeDto,
    updatedBy: number,
  ): Promise<Employee> {
    const employee = await this.findOne(id);

    // Validate userId uniqueness if it's being changed
    if (data.userId !== undefined) {
      if (data.userId !== null) {
        const existingEmployeeWithUser = await this.employeeRepository.findOne({
          where: { userId: data.userId },
        });
        if (existingEmployeeWithUser && existingEmployeeWithUser.id !== id) {
          throw new BadRequestException(
            'Tài khoản này đã được liên kết với nhân viên khác',
          );
        }
      }
    }

    if (data.birthDate) {
      this.validateAge(data.birthDate);
    }
    Object.assign(employee, data);
    employee.updatedBy = updatedBy;
    return this.employeeRepository.save(employee);
  }

  async updateEmployeeStatus(
    id: number,
    status: EmployeeStatus,
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
      return this.executeUpdateEmployeeStatus(id, status, updatedBy);
    }

    const oldData = await this.findOne(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.UPDATE,
        metadata: {
          serviceName: 'EmployeeService',
          methodName: 'executeUpdateEmployeeStatus',
          args: [id, status],
          oldData,
          newData: { status },
        },
        reason: reason || `Cập nhật trạng thái nhân viên ID: ${id}`,
      },
      updatedBy,
    );
  }

  async executeUpdateEmployeeStatus(
    id: number,
    status: EmployeeStatus,
    updatedBy: number,
  ): Promise<Employee> {
    const employee = await this.findOne(id);
    employee.status = status;
    employee.updatedBy = updatedBy;

    // Save FIRST to make sure DB has the new status for UserService validation
    const savedEmployee = await this.employeeRepository.save(employee);

    // Sync associated account status
    if (savedEmployee.userId) {
      try {
        await this.userService.update(savedEmployee.userId, {
          status:
            status === EmployeeStatus.WORKING
              ? UserStatus.ACTIVE
              : UserStatus.INACTIVE,
        });
      } catch (error) {
        console.error(
          'Failed to sync account status during employee update:',
          error,
        );
        // We continue because the user wants employee management to be "free"
        // and we already saved the employee status.
      }
    }

    return savedEmployee;
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
          serviceName: 'EmployeeService',
          methodName: 'executeRemove',
          args: [id],
          oldData,
        },
        reason: reason || `Xoá nhân viên ID: ${id}`,
      },
      deletedBy,
    );
  }

  async executeRemove(id: number, deletedBy: number): Promise<void> {
    const employee = await this.findOne(id);
    employee.deletedBy = deletedBy;
    await this.employeeRepository.save(employee); // Save deletedBy first
    await this.employeeRepository.softRemove(employee);
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

    const oldData = await this.employeeRepository.findByIds(ids);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        metadata: {
          serviceName: 'EmployeeService',
          methodName: 'executeRemoveMany',
          args: [ids],
          oldData,
        },
        reason: reason || `Xoá hàng loạt ${ids.length} nhân viên`,
      },
      deletedBy,
    );
  }

  async executeRemoveMany(ids: number[], deletedBy: number): Promise<void> {
    const employees = await this.employeeRepository.findByIds(ids);
    for (const employee of employees) {
      employee.deletedBy = deletedBy;
    }
    await this.employeeRepository.save(employees);
    await this.employeeRepository.softRemove(employees);
  }

  /**
   * Lấy danh sách user chưa bị gán cho nhân viên nào.
   * Nếu excludeEmployeeId được cung cấp, bao gồm cả user đang gán cho nhân viên đó.
   */
  async getAvailableUsers(
    excludeEmployeeId?: number,
  ): Promise<{ id: number; email: string; fullName: string }[]> {
    // Lấy tất cả userId đã bị gán (ngoại trừ nhân viên đang edit)
    const assignedEmployees = await this.employeeRepository.find({
      where: { userId: Not(IsNull()) },
      select: ['userId', 'id'],
    });

    const assignedUserIds = assignedEmployees
      .filter((e) => !excludeEmployeeId || e.id !== excludeEmployeeId)
      .map((e) => e.userId)
      .filter((uid): uid is number => uid !== null && uid !== undefined);

    // Query users không bị gán
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    queryBuilder.select(['user.id', 'user.email', 'user.fullName']);

    if (assignedUserIds.length > 0) {
      queryBuilder.where('user.id NOT IN (:...ids)', { ids: assignedUserIds });
    }

    return queryBuilder.getMany();
  }
}
