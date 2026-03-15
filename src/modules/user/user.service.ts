import {
  Injectable,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserAdminDto, UpdateUserAdminDto } from './dto/admin-user.dto';
import { Employee, EmployeeStatus } from '../employee/entities/employee.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmailService } from '../../core/email/email.service';
import { MESSAGES } from '../../common/constants/messages.constant';
import { ApprovalsService } from '../approval/approvals.service';
import {
  ApprovalRequest,
  ApprovalType,
} from '../approval/entities/approval-request.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/dto/notification.dto';
import { Role } from '../role/entities/role.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private emailService: EmailService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvalsService: ApprovalsService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(
    createUserDto: CreateUserDto | CreateUserAdminDto,
    createdBy?: number,
    reason?: string,
  ): Promise<User | ApprovalRequest> {
    const user = createdBy ? await this.findById(createdBy) : null;
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin || !createdBy) {
      return this.executeCreate(createUserDto, createdBy);
    }

    return this.approvalsService.create(
      {
        type: ApprovalType.CREATE,
        targetModule: 'Tài khoản',
        metadata: {
          serviceName: 'UserService',
          methodName: 'executeCreate',
          args: [createUserDto],
          newData: createUserDto,
        },
        reason: reason || `Tạo tài khoản mới: ${createUserDto.email}`,
      },
      createdBy,
    );
  }

  async executeCreate(
    createUserDto: CreateUserDto | CreateUserAdminDto,
    createdBy?: number,
    skipNotification = false,
  ): Promise<User> {
    const data = { ...createUserDto } as CreateUserAdminDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, password, reason: _reason, ...rest } = data;
    const roleId = data.roleId;

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = this.usersRepository.create({
      ...rest,
      email,
      password: hashedPassword,
      verificationToken,
      createdBy,
      updatedBy: createdBy,
      role: roleId ? { id: roleId } : undefined,
    });

    const savedUser: User = await this.usersRepository.save(newUser);

    // Send welcome/verification email
    await this.emailService.sendWelcomeEmail(
      savedUser.email,
      savedUser.fullName,
    );
    await this.emailService.sendVerificationEmail(
      savedUser.email,
      savedUser.fullName,
      verificationToken,
    );

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Tài khoản mới',
        `Tài khoản "${savedUser.email}" đã được tạo.`,
        { type: 'USER', action: 'CREATE', id: savedUser.id },
      );
    }

    return savedUser;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .addSelect('user.password')
      .addSelect('user.fullName')
      .where('user.email = :email', { email })
      .getOne();
    return user || undefined;
  }

  async findById(id: number): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    return user || undefined;
  }

  async findWithPasswordById(id: number): Promise<User | undefined> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    return user || undefined;
  }

  async updateRefreshToken(
    id: number,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedRefreshToken = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : null;

    await this.usersRepository.update(id, {
      refreshToken: hashedRefreshToken as string,
    });
  }

  async updateVerificationToken(id: number, token: string): Promise<void> {
    await this.usersRepository.update(id, { verificationToken: token });
  }

  async verifyEmail(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { verificationToken: token },
    });
    if (!user) return null;

    user.isVerified = true;
    user.verificationToken = null;
    return this.usersRepository.save(user);
  }

  async updateResetPasswordToken(
    email: string,
    token: string,
    expires: Date,
  ): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    return this.usersRepository.save(user);
  }

  async findByResetToken(token: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { resetPasswordToken: token },
    });
    if (!user) return null;

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      return null;
    }

    return user;
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  async findAll(): Promise<
    (User & {
      employee?: { id: number; fullName: string; employeeCode: string } | null;
    })[]
  > {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.employee',
        'employees',
        'employee',
        'employee.user_id = user.id AND employee.deleted_at IS NULL',
      )
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.status',
        'user.isVerified',
      ])
      .addSelect(['employee.id', 'employee.fullName', 'employee.employeeCode'])
      .leftJoinAndSelect('user.role', 'role')
      .getMany();
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto | UpdateUserAdminDto,
    updatedBy?: number,
    reason?: string,
  ): Promise<User | ApprovalRequest | undefined> {
    const user = updatedBy ? await this.findById(updatedBy) : null;
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    // Allow user to update their own profile without approval (e.g. upload avatar)
    if (isAdmin || !updatedBy || updatedBy === id) {
      return this.executeUpdate(id, updateUserDto, updatedBy);
    }

    const oldData = await this.findById(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.UPDATE,
        targetModule: 'Tài khoản',
        metadata: {
          serviceName: 'UserService',
          methodName: 'executeUpdate',
          args: [id, updateUserDto],
          oldData,
          newData: updateUserDto,
        },
        reason: reason || `Cập nhật tài khoản: ${oldData?.email || id}`,
      },
      updatedBy,
    );
  }

  async executeUpdate(
    id: number,
    updateUserDto: UpdateUserDto | UpdateUserAdminDto,
    updatedBy?: number,
    skipNotification = false,
  ): Promise<User | undefined> {
    const user = await this.findById(id);
    if (!user) return undefined;

    const data = { ...updateUserDto } as UpdateUserAdminDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { roleId, role, reason: _reason, password, ...rest } = data;

    // Check if employee resignation prevents unlocking
    if (rest.status === UserStatus.ACTIVE) {
      const employee = await this.employeeRepository.findOne({
        where: { userId: id },
      });
      if (employee && employee.status === EmployeeStatus.RESIGNED) {
        throw new BadRequestException(
          'Không thể mở khoá tài khoản này vì nhân viên liên kết đã nghỉ việc.',
        );
      }
    }

    // Hash password if changed
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Update fields
    Object.assign(user, rest);
    if (updatedBy) {
      user.updatedBy = updatedBy;
    }

    if (roleId) {
      user.role = { id: roleId } as Role;
    }

    const savedUser = await this.usersRepository.save(user);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Cập nhật tài khoản',
        `Thông tin tài khoản "${savedUser.email}" đã được cập nhật.`,
        { type: 'USER', action: 'UPDATE', id: savedUser.id },
      );
    }

    return savedUser;
  }

  async remove(
    id: number,
    deletedBy: number,
    reason?: string,
  ): Promise<void | ApprovalRequest> {
    const user = deletedBy ? await this.findById(deletedBy) : null;
    const roleName =
      user?.role && typeof user.role === 'object'
        ? (user.role as { name: string }).name
        : (user?.role as string | undefined);
    const isAdmin = roleName === 'ADMIN' || roleName === 'CHỦ CỬA HÀNG';

    if (isAdmin || !deletedBy) {
      return this.executeRemove(id, deletedBy);
    }

    const oldData = await this.findById(id);

    return this.approvalsService.create(
      {
        type: ApprovalType.DELETE,
        targetModule: 'Tài khoản',
        metadata: {
          serviceName: 'UserService',
          methodName: 'executeRemove',
          args: [id],
          oldData,
        },
        reason: reason || `Xóa tài khoản ID: ${id}`,
      },
      deletedBy,
    );
  }

  async executeRemove(
    id: number,
    deletedBy: number,
    skipNotification = false,
  ): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepository.update(id, { deletedBy });
    await this.usersRepository.softDelete(id);

    // Broadcast notification
    if (!skipNotification) {
      void this.notificationService.sendNotification(
        NotificationType.DATA_MODIFIED,
        'Xóa tài khoản',
        `Tài khoản "${user?.email || 'N/A'}" đã bị xóa khỏi hệ thống.`,
        { type: 'USER', action: 'DELETE', id },
      );
    }
  }

  async findAdmins(): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roles)', { roles: ['ADMIN', 'CHỦ CỬA HÀNG'] })
      .getMany();
  }
}
