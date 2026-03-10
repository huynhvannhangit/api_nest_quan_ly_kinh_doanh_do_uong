import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../invoice/entities/invoice.entity';
import { InvoiceItem } from '../invoice/entities/invoice-item.entity';
import { Area } from '../area/entities/area.entity';
import { Table } from '../table/entities/table.entity';
import { Category } from '../category/entities/category.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import {
  ApprovalRequest,
  ApprovalStatus,
} from '../approval/entities/approval-request.entity';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { MESSAGES } from '../../common/constants/messages.constant';

interface RawRevenue {
  date: string;
  revenue: string;
  count: string;
}

interface RawTopProduct {
  name: string;
  quantity: string;
  revenue: string;
}

export interface DashboardData {
  overview: any;
  revenue: any[];
  topProducts: any[];
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepository: Repository<ApprovalRequest>,
  ) {}

  private dashboardCache: { data: DashboardData; expiresAt: number } | null =
    null;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute

  async getOverview() {
    const [
      totalRevenueResult,
      totalOrders,
      paidOrders,
      totalAreas,
      totalTables,
      totalCategories,
      totalProducts,
      totalEmployees,
      totalOrdersCount,
      totalUsers,
      pendingApprovals,
    ] = await Promise.all([
      this.invoiceRepository
        .createQueryBuilder('invoice')
        .where('invoice.status = :status', { status: InvoiceStatus.PAID })
        .select('SUM(invoice.total)', 'total')
        .getRawOne<{ total: string | null }>(),
      this.invoiceRepository.count(),
      this.invoiceRepository.count({
        where: { status: InvoiceStatus.PAID },
      }),
      this.areaRepository.count(),
      this.tableRepository.count(),
      this.categoryRepository.count(),
      this.productRepository.count(),
      this.employeeRepository.count(),
      this.orderRepository.count(),
      this.userRepository.count(),
      this.approvalRepository.count({
        where: { status: ApprovalStatus.PENDING },
      }),
    ]);

    return {
      totalRevenue: parseFloat(totalRevenueResult?.total || '0'),
      totalOrders,
      paidOrders,
      completionRate: totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0,
      totalAreas,
      totalTables,
      totalCategories,
      totalProducts,
      totalEmployees,
      totalOrdersCount,
      totalUsers,
      pendingApprovals,
    };
  }

  async getRevenueByDateRange(query: StatisticsQueryDto) {
    const startDate = query.startDate
      ? dayjs(query.startDate).startOf('day').toDate()
      : dayjs().subtract(7, 'day').startOf('day').toDate();
    const endDate = query.endDate
      ? dayjs(query.endDate).endOf('day').toDate()
      : dayjs().endOf('day').toDate();

    let dateFormat = '%Y-%m-%d';
    if (query.groupBy === 'week') {
      dateFormat = '%Y-%u'; // Year-WeekNumber
    } else if (query.groupBy === 'month') {
      dateFormat = '%Y-%m';
    }

    const revenueData = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('invoice.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .select(`DATE_FORMAT(invoice.createdAt, '${dateFormat}')`, 'date')
      .addSelect('SUM(invoice.total)', 'revenue')
      .addSelect('COUNT(invoice.id)', 'count')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<RawRevenue>();

    return revenueData.map((item) => ({
      date: item.date,
      revenue: parseFloat(item.revenue || '0'),
      count: parseInt(item.count || '0'),
    }));
  }

  async exportExcel(query: StatisticsQueryDto, res: Response) {
    try {
      const revenueData = await this.getRevenueByDateRange(query);
      const topProducts = await this.getTopProducts();

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Báo cáo doanh thu');

      // Title
      sheet.mergeCells('A1:C1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'BÁO CÁO DOANH THU';
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      // Filter info
      const startDisplay = query.startDate
        ? dayjs(query.startDate).format('DD/MM/YYYY')
        : 'Tất cả';
      const endDisplay = query.endDate
        ? dayjs(query.endDate).format('DD/MM/YYYY')
        : 'Tất cả';

      let filterText = '';
      if (
        query.startDate &&
        query.endDate &&
        query.startDate === query.endDate
      ) {
        filterText = `Ngày: ${startDisplay}`;
      } else {
        filterText = `Từ ngày: ${startDisplay} - Đến ngày: ${endDisplay}`;
      }

      sheet.addRow([filterText]);
      sheet.addRow([]);

      // Revenue Table
      sheet.addRow(['Thời gian', 'Số đơn hàng', 'Doanh thu (VNĐ)']);
      sheet.getRow(4).font = { bold: true };
      sheet.getRow(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      revenueData.forEach((item) => {
        let displayDate = item.date;
        if (query.groupBy === 'month') {
          const [year, month] = item.date.split('-');
          displayDate = `Tháng ${parseInt(month)} năm ${year}`;
        } else if (query.groupBy === 'week') {
          const [year, weekNum] = item.date.split('-');
          const weekStart = dayjs()
            .year(parseInt(year))
            .isoWeek(parseInt(weekNum))
            .startOf('isoWeek');
          const month = weekStart.month() + 1;
          let count = 0;
          let temp = weekStart.clone().startOf('month');
          while (temp.isoWeekday() !== 1) {
            temp = temp.add(1, 'day');
          }
          while (temp.isBefore(weekStart) || temp.isSame(weekStart, 'day')) {
            count++;
            temp = temp.add(1, 'week');
          }
          displayDate = `Tháng ${month} Tuần thứ ${count} (Tuần ${weekNum}/${year})`;
        } else {
          const d = dayjs(item.date);
          if (d.isValid()) {
            displayDate = d.format('DD/MM/YYYY');
          }
        }
        sheet.addRow([displayDate, item.count, item.revenue]);
      });

      sheet.addRow([]);
      sheet.addRow(['TOP 5 SẢN PHẨM BÁN CHẠY']);
      sheet.getRow(sheet.rowCount).font = { bold: true };

      sheet.addRow(['Tên sản phẩm', 'Số lượng', 'Doanh thu (VNĐ)']);
      sheet.getRow(sheet.rowCount).font = { bold: true };

      topProducts.forEach((p) => {
        sheet.addRow([p.name, p.quantity, p.revenue]);
      });

      // Formatting
      sheet.columns = [
        { width: 25 }, // Date/Product Name
        { width: 15 }, // Count/Quantity
        { width: 20 }, // Revenue
      ];

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      const typeText =
        query.groupBy === 'month'
          ? 'tháng'
          : query.groupBy === 'week'
            ? 'tuần'
            : 'ngày';

      let dateText = '';
      const start = query.startDate ? dayjs(query.startDate) : null;
      const end = query.endDate ? dayjs(query.endDate) : null;

      if (start && end) {
        if (start.isSame(end, 'day')) {
          dateText = start.format('DD-MM-YYYY');
        } else {
          dateText = `${start.format('DD-MM-YYYY')} đến ${end.format('DD-MM-YYYY')}`;
        }
      } else if (start) {
        dateText = start.format('DD-MM-YYYY');
      } else {
        dateText = dayjs().format('DD-MM-YYYY');
      }

      const filename = encodeURIComponent(
        `thống kê doanh thu ${typeText} ${dateText}.xlsx`,
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${filename}`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export Excel error:', error);
      throw new InternalServerErrorException(MESSAGES.EXCEL_EXPORT_ERROR);
    }
  }

  async getTopProducts() {
    const topProducts = await this.invoiceItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.product', 'product')
      .select('product.name', 'name')
      .addSelect('SUM(item.quantity)', 'quantity')
      .addSelect('SUM(item.total)', 'revenue')
      .groupBy('product.id')
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany<RawTopProduct>();

    return topProducts.map((p) => ({
      name: p.name,
      quantity: parseFloat(p.quantity || '0'),
      revenue: parseFloat(p.revenue || '0'),
    }));
  }

  async getDashboardData() {
    const now = Date.now();
    if (this.dashboardCache && this.dashboardCache.expiresAt > now) {
      return this.dashboardCache.data;
    }

    const [overview, revenue, topProducts] = await Promise.all([
      this.getOverview(),
      this.getRevenueByDateRange({}),
      this.getTopProducts(),
    ]);

    const data = {
      overview,
      revenue,
      topProducts,
    };

    this.dashboardCache = {
      data,
      expiresAt: now + this.CACHE_TTL,
    };

    return data;
  }
}
