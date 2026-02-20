import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';
import { Permission } from '../../common/enums/permission.enum';
import { RoleService } from '../../modules/role/roles.service';

@Injectable()
export class SeedsService implements OnModuleInit {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed(): Promise<void> {
    await this.seedRoles();
    await this.seedAdminUser();
  }

  private async seedRoles(): Promise<void> {
    const roles = [
      {
        name: 'ADMIN',
        description: 'Quản trị viên hệ thống',
        permissions: Object.values(Permission), // All permissions
      },
      {
        name: 'MANAGER',
        description: 'Quản lý cửa hàng',
        permissions: [
          Permission.USER_VIEW,
          Permission.USER_CREATE,
          Permission.USER_UPDATE,
          Permission.PRODUCT_VIEW,
          Permission.PRODUCT_CREATE,
          Permission.PRODUCT_UPDATE,
          Permission.PRODUCT_DELETE,
          Permission.ORDER_VIEW,
          Permission.ORDER_CREATE,
          Permission.ORDER_UPDATE,
          Permission.ORDER_DELETE,
          Permission.ORDER_CANCEL,
          Permission.INVOICE_VIEW,
          Permission.INVOICE_CREATE,
          Permission.INVOICE_PAY,
          Permission.TABLE_VIEW,
          Permission.TABLE_UPDATE,
          Permission.AREA_VIEW,
          Permission.EMPLOYEE_VIEW,
          Permission.EMPLOYEE_CREATE,
          Permission.EMPLOYEE_UPDATE,
          Permission.STATISTICS_VIEW,
          Permission.STATISTICS_EXPORT,
        ],
      },
      {
        name: 'STAFF',
        description: 'Nhân viên',
        permissions: [
          Permission.PRODUCT_VIEW,
          Permission.ORDER_VIEW,
          Permission.ORDER_CREATE,
          Permission.ORDER_UPDATE,
          Permission.TABLE_VIEW,
          Permission.TABLE_UPDATE,
          Permission.AREA_VIEW,
        ],
      },
    ];

    for (const roleData of roles) {
      const existingRole = await this.roleService.findByName(roleData.name);
      if (!existingRole) {
        await this.roleService.create({
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
          isActive: true,
        });
        this.logger.log(`Created default role: ${roleData.name}`);
      }
    }
  }

  private async seedAdminUser(): Promise<void> {
    const adminEmail = 'zingm0766@gmail.com';

    try {
      const existingAdmin = await this.userService.findByEmail(adminEmail);

      if (existingAdmin) {
        this.logger.log('Admin user already exists. Skipping seed.');
        return;
      }

      const adminRole = await this.roleService.findByName('ADMIN');

      const newUser = await this.userService.create({
        email: adminEmail,
        password: 'Admin@123456', // Default strong password
        fullName: 'Administrator',
        roleId: adminRole?.id,
      });

      // Manually verify the admin user
      await this.userService.updateVerificationToken(newUser.id, 'VERIFIED');
      await this.userService.verifyEmail('VERIFIED');

      this.logger.log('Admin user created successfully!');
      this.logger.log(`Email: ${adminEmail}`);
      this.logger.log('Password: Admin@123456');
    } catch (error) {
      this.logger.error('Failed to seed admin user:', error);
      // Don't throw to prevent app crash if seed fails
    }
  }
}
