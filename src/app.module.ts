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

// --- Controllers & Services ---
import { AppController } from './app.controller';
import { AppService } from './app.service';

// --- Global Filters & Interceptors ---
import { AllExceptionsFilter } from './core/filters/http-exception.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { ActionLogInterceptor } from './core/interceptors/action-log.interceptor';

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
    // 1. LoggerMiddleware
    // Log thông tin cơ bản của request (method, url, status code).
    consumer
      .apply(LoggerMiddleware)
      .exclude(
        'auth/login',
        'auth/register',
        'auth/refresh',
        'auth/forgot-password',
        'auth/reset-password',
        'auth/verify-email',
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 2. AuthMiddleware
    // Xác thực người dùng (Authentication), check JWT token.
    consumer
      .apply(AuthMiddleware)
      .exclude(
        'auth/login',
        'auth/register',
        'auth/refresh',
        'auth/forgot-password',
        'auth/reset-password',
        'auth/verify-email',
        {
          path: 'api',
          method: RequestMethod.GET,
        },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
