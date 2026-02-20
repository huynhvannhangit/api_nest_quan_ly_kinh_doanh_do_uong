import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EmailService } from '../../core/email/email.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    createdBy?: number,
  ): Promise<User> {
    const { email, password, roleId, ...rest } = createUserDto;

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
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

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    updatedBy?: number,
  ): Promise<User | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { roleId, role, ...rest } = updateUserDto;

    const updatePayload: Record<string, any> = {
      ...rest,
      updatedBy,
    };

    if (roleId) {
      updatePayload.role = { id: roleId };
    }

    await this.usersRepository.update(id, updatePayload);
    return this.findById(id);
  }

  async remove(id: number, deletedBy: number): Promise<void> {
    await this.usersRepository.update(id, { deletedBy });
    await this.usersRepository.softDelete(id);
  }
}
