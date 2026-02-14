import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async create(data: Partial<Invoice>, createdBy: number): Promise<Invoice> {
    const invoiceNumber = `INV-${Date.now()}`;
    const invoice = this.invoiceRepository.create({
      ...data,
      invoiceNumber,
      createdBy,
      updatedBy: createdBy,
    });
    return this.invoiceRepository.save(invoice);
  }

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      relations: ['items', 'table', 'creator'],
    });
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items', 'table', 'creator'],
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }

  async update(
    id: number,
    data: Partial<Invoice>,
    updatedBy: number,
  ): Promise<Invoice> {
    await this.findOne(id);
    await this.invoiceRepository.update(id, { ...data, updatedBy });
    return this.findOne(id);
  }

  async remove(id: number, deletedBy: number): Promise<void> {
    const invoice = await this.findOne(id);
    invoice.deletedBy = deletedBy;
    await this.invoiceRepository.save(invoice);
    await this.invoiceRepository.softRemove(invoice);
  }
}
