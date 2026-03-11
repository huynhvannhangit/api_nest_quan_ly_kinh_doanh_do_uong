import {
  Controller,
  Get,
  Query,
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { StatisticsService } from './statistics.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW_ALL)
  getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('revenue')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW_ALL)
  getRevenue(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getRevenueByDateRange(query);
  }

  @Get('top-products')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW_ALL)
  getTopProducts() {
    return this.statisticsService.getTopProducts();
  }

  @Get('export')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_EXPORT)
  async export(@Query() query: StatisticsQueryDto, @Res() res: Response) {
    return this.statisticsService.exportExcel(query, res);
  }

  @Get('dashboard')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW_ALL)
  getDashboard() {
    return this.statisticsService.getDashboardData();
  }
}
