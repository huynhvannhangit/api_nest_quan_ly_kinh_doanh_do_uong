import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// --- Controllers & Services ---
import { AppController } from './app.controller';
import { AppService } from './app.service';

// --- Global Filters & Interceptors ---
import { AllExceptionsFilter } from './core/filters/http-exception.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { ActionLogInterceptor } from './core/interceptors/action-log.interceptor';
import { SystemConfigModule } from './modules/system-config/system-config.module';

// --- Middleware ---
import { LoggerMiddleware } from './core/middleware/logger.middleware';
import { AuthMiddleware } from './core/middleware/auth.middleware';

// --- Core Modules ---
import { AuthModule } from './core/auth/auth.module';
import { EmailModule } from './core/email/email.module';

// --- Feature Modules ---
import { UserModule } from './modules/user/user.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { AreaModule } from './modules/area/area.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { CategoryModule } from './modules/category/category.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { TableModule } from './modules/table/table.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { LoggingModule } from './modules/logging/logging.module';
import { SeedsModule } from './database/seeds/seeds.module';
import { RoleModule } from './modules/role/role.module';
import { NotificationModule } from './modules/notification/notification.module';

/**
 * @module AppModule
 * @description
 * Module gốc (Root Module) của ứng dụng NestJS.
 * Chịu trách nhiệm:
 * - Cấu hình toàn cục (Config, Database).
 * - Import các module chức năng (Feature Modules).
 * - Thiết lập các Providers toàn cục (Filters, Interceptors).
 * - Cấu hình Middleware trong method configure.
 */
@Module({
  imports: [
    // --- 1. Global Configuration ---
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // --- 2. Database Connection ---
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Auto-create tables (dev only)
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),

    // --- 3. Feature Modules ---
    AuthModule,
    UserModule,
    EmailModule,
    SeedsModule,
    EmployeeModule,
    AreaModule,
    ProductModule,
    OrderModule,
    CategoryModule,
    InvoiceModule,
    AiAssistantModule,
    TableModule,
    StatisticsModule,
    ApprovalModule,
    ApprovalModule,
    LoggingModule,
    JwtModule.register({}),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/public',
    }),
    RoleModule,
    SystemConfigModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // --- Global Exception Filters ---
    {
      provide: APP_FILTER,

      useClass: AllExceptionsFilter,
    },

    // --- Global Interceptors ---
    {
      provide: APP_INTERCEPTOR,

      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActionLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Cấu hình các Middlewares cho ứng dụng.
   * Middleware chạy trước khi request đến được Route Handler.
   * @param consumer MiddlewareConsumer
   */
  configure(consumer: MiddlewareConsumer) {
    // LoggerMiddleware: Log thông tin cơ bản của request
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });

    // AuthMiddleware: Xác thực JWT token trước khi vào các route bảo mật
    // Trong NestJS 11, phải dùng '*path' thay vì '*'
    // và phải thêm prefix 'api/' vì globalPrefix được áp dụng trước middleware
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: '/api/auth/login', method: RequestMethod.POST },
        { path: '/api/auth/register', method: RequestMethod.POST },
        { path: '/api/auth/refresh', method: RequestMethod.POST },
        { path: '/api/auth/forgot-password', method: RequestMethod.POST },
        { path: '/api/auth/reset-password', method: RequestMethod.POST },
        { path: '/api/auth/verify-email', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
