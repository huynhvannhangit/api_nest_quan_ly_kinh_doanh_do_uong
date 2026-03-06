import { Controller, Get, Query, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import { StatisticsService } from './statistics.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW)
  getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('revenue')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW)
  getRevenue(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getRevenueByDateRange(query);
  }

  @Get('top-products')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW)
  getTopProducts() {
    return this.statisticsService.getTopProducts();
  }

  @Get('export')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW)
  async export(@Query() query: StatisticsQueryDto, @Res() res: Response) {
    return this.statisticsService.exportExcel(query, res);
  }

  @Get('dashboard')
  @HttpCode(200)
  @Permissions(Permission.STATISTICS_VIEW)
  getDashboard() {
    return this.statisticsService.getDashboardData();
  }
}
