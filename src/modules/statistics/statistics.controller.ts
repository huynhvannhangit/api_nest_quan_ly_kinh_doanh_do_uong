import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @Permissions(Permission.STATISTICS_VIEW)
  getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('revenue')
  @Permissions(Permission.STATISTICS_VIEW)
  getRevenue(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.getRevenueByDateRange(query);
  }

  @Get('top-products')
  @Permissions(Permission.STATISTICS_VIEW)
  getTopProducts() {
    return this.statisticsService.getTopProducts();
  }
}
