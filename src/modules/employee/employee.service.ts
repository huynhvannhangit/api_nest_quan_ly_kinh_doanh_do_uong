import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private async generateEmployeeCode(): Promise<string> {
    // Find the latest employee by ID to get the next number
    const lastEmployees = await this.employeeRepository.find({
      order: { id: 'DESC' },
      withDeleted: true, // Include soft-deleted to avoid code conflicts
      take: 1,
    });
    const lastEmployee = lastEmployees[0];

    let nextNumber = 1;
    if (lastEmployee && lastEmployee.employeeCode) {
      // Extract number from code like "NV001" -> 1
      const match = lastEmployee.employeeCode.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Format as NV001, NV002, etc.
    return `NV${nextNumber.toString().padStart(3, '0')}`;
  }

  async create(data: CreateEmployeeDto, createdBy: number): Promise<Employee> {
    try {
      console.log('=== Creating Employee ===');
      console.log('Input data:', JSON.stringify(data, null, 2));
      console.log('Created by user ID:', createdBy);

      const employee = new Employee();

      // Assign data first (excluding employeeCode)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { employeeCode: _employeeCode, ...employeeData } = data;
      Object.assign(employee, employeeData);

      console.log('Employee after data assignment:', employee);

      // Auto-generate employee code (this ensures it won't be overwritten)
      employee.employeeCode = await this.generateEmployeeCode();

      console.log('Generated employee code:', employee.employeeCode);

      employee.createdBy = createdBy;
      employee.updatedBy = createdBy;

      console.log('Employee before save:', employee);

      this.validateAge(employeeData.birthDate);

      const result = await this.employeeRepository.save(employee);
      console.log('Employee created successfully with ID:', result.id);
      return result;
    } catch (error) {
      console.error('=== Error Creating Employee ===');

      console.error('Error message:', (error as Error).message);

      console.error('Error stack:', (error as Error).stack);
      console.error('Error details:', error);
      throw error;
    }
  }

  private validateAge(birthDateString: string | Date | undefined) {
    if (!birthDateString) return;
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      throw new BadRequestException('Employee must be at least 18 years old');
    }
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  async update(
    id: number,
    data: UpdateEmployeeDto,
    updatedBy: number,
  ): Promise<Employee> {
    const employee = await this.findOne(id);
    if (data.birthDate) {
      this.validateAge(data.birthDate);
    }
    Object.assign(employee, data);
    employee.updatedBy = updatedBy;
    return this.employeeRepository.save(employee);
  }

  async remove(id: number, deletedBy: number): Promise<void> {
    const employee = await this.findOne(id);
    employee.deletedBy = deletedBy;
    await this.employeeRepository.save(employee); // Save deletedBy first
    await this.employeeRepository.softRemove(employee);
  }
}
