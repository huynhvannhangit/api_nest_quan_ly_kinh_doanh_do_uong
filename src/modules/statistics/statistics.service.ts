import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../invoice/entities/invoice.entity';
import { InvoiceItem } from '../invoice/entities/invoice-item.entity';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import dayjs from 'dayjs';

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

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
  ) {}

  async getOverview() {
    const totalRevenueResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.status = :status', { status: InvoiceStatus.PAID })
      .select('SUM(invoice.total)', 'total')
      .getRawOne<{ total: string | null }>();

    const totalOrders = await this.invoiceRepository.count();
    const paidOrders = await this.invoiceRepository.count({
      where: { status: InvoiceStatus.PAID },
    });

    return {
      totalRevenue: parseFloat(totalRevenueResult?.total || '0'),
      totalOrders,
      paidOrders,
      completionRate: totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0,
    };
  }

  async getRevenueByDateRange(query: StatisticsQueryDto) {
    const startDate = query.startDate
      ? dayjs(query.startDate).startOf('day').toDate()
      : dayjs().subtract(7, 'day').startOf('day').toDate();
    const endDate = query.endDate
      ? dayjs(query.endDate).endOf('day').toDate()
      : dayjs().endOf('day').toDate();

    const revenueData = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('invoice.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .select("DATE_FORMAT(invoice.createdAt, '%Y-%m-%d')", 'date')
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
}
