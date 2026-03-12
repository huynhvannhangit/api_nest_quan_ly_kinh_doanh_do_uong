import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';
import { Permission } from '../../common/enums/permission.enum';
import { RoleService } from '../../modules/role/roles.service';
import { SystemConfigService } from '../../modules/system-config/system-config.service';

@Injectable()
export class SeedsService implements OnModuleInit {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    private readonly userService: UserService,
    private readonly roleService: RoleService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed(): Promise<void> {
    await this.seedRoles();
    await this.seedAdminUser();
    await this.seedSystemConfig();
  }

  private async seedRoles(): Promise<void> {
    const roles = [
      {
        name: 'CHỦ CỬA HÀNG',
        description: 'Chủ cửa hàng (Toàn quyền hệ thống)',
        permissions: Object.values(Permission), // All permissions
      },
      {
        name: 'QUẢN LÝ',
        description: 'Quản lý cửa hàng (Điều hành & Phê duyệt)',
        permissions: [
          Permission.DASHBOARD_VIEW_ALL,
          Permission.AREA_VIEW_ALL,
          Permission.AREA_CREATE,
          Permission.AREA_VIEW_ID,
          Permission.AREA_UPDATE,
          Permission.TABLE_VIEW_ALL,
          Permission.TABLE_CREATE,
          Permission.TABLE_VIEW_ID,
          Permission.TABLE_UPDATE,
          Permission.CATEGORY_VIEW_ALL,
          Permission.CATEGORY_CREATE,
          Permission.CATEGORY_VIEW_ID,
          Permission.CATEGORY_UPDATE,
          Permission.PRODUCT_VIEW_ALL,
          Permission.PRODUCT_CREATE,
          Permission.PRODUCT_VIEW_ID,
          Permission.PRODUCT_UPDATE,
          Permission.USER_VIEW_ALL,
          Permission.USER_VIEW_ID,
          Permission.EMPLOYEE_VIEW_ALL,
          Permission.EMPLOYEE_VIEW_ID,
          Permission.ORDER_VIEW_ALL,
          Permission.ORDER_CREATE,
          Permission.ORDER_VIEW_ID,
          Permission.ORDER_UPDATE,
          Permission.ORDER_CANCEL,
          Permission.INVOICE_VIEW_ALL,
          Permission.INVOICE_VIEW_ID,
          Permission.INVOICE_CANCEL,
          Permission.INVOICE_PAY,
          Permission.STATISTICS_VIEW_ALL,
          Permission.STATISTICS_EXPORT,
        ],
      },
      {
        name: 'NHÂN VIÊN THU NGÂN',
        description: 'Nhân viên thu ngân (Hóa đơn & Thanh toán)',
        permissions: [
          Permission.AREA_VIEW_ALL,
          Permission.AREA_VIEW_ID,
          Permission.TABLE_VIEW_ALL,
          Permission.TABLE_VIEW_ID,
          Permission.CATEGORY_VIEW_ALL,
          Permission.CATEGORY_VIEW_ID,
          Permission.PRODUCT_VIEW_ALL,
          Permission.PRODUCT_VIEW_ID,
          Permission.ORDER_VIEW_ALL,
          Permission.ORDER_CREATE,
          Permission.ORDER_VIEW_ID,
          Permission.ORDER_UPDATE,
          Permission.ORDER_DELETE,
          Permission.ORDER_CANCEL,
          Permission.INVOICE_VIEW_ALL,
          Permission.INVOICE_VIEW_ID,
          Permission.INVOICE_CANCEL,
          Permission.INVOICE_PAY,
          Permission.STATISTICS_VIEW_ALL,
        ],
      },
      {
        name: 'NHÂN VIÊN PHỤC VỤ',
        description: 'Nhân viên phục vụ (Order & Bàn)',
        permissions: [
          Permission.AREA_VIEW_ALL,
          Permission.AREA_VIEW_ID,
          Permission.TABLE_VIEW_ALL,
          Permission.TABLE_VIEW_ID,
          Permission.CATEGORY_VIEW_ALL,
          Permission.CATEGORY_VIEW_ID,
          Permission.PRODUCT_VIEW_ALL,
          Permission.PRODUCT_VIEW_ID,
          Permission.ORDER_VIEW_ALL,
          Permission.ORDER_CREATE,
          Permission.ORDER_VIEW_ID,
          Permission.ORDER_UPDATE,
          Permission.ORDER_CANCEL,
          Permission.INVOICE_VIEW_ALL,
          Permission.INVOICE_VIEW_ID,
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

      const adminRole = await this.roleService.findByName('CHỦ CỬA HÀNG');

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

  private async seedSystemConfig(): Promise<void> {
    try {
      const adminEmail = 'zingm0766@gmail.com';
      const admin = await this.userService.findByEmail(adminEmail);

      if (!admin) {
        this.logger.warn(
          'Admin user not found. Skipping SystemConfig audit initialization.',
        );
        return;
      }

      const config = await this.systemConfigService.get();
      if (!config.createdBy) {
        // We use a partial update to trigger the audit logic if possible,
        // but since get() already created it if missing, we manually set createdBy for the first time.
        config.createdBy = admin.id;
        config.updatedBy = admin.id;
        await this.systemConfigService.update({}, admin.id);
        this.logger.log('SystemConfig audit fields initialized.');
      }
    } catch (error) {
      this.logger.error('Failed to seed system config:', error);
    }
  }
}
