import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private async generateEmployeeCode(): Promise<string> {
    // Find the latest employee by ID to get the next number
    const lastEmployee = await this.employeeRepository.findOne({
      order: { id: 'DESC' },
      withDeleted: true, // Include soft-deleted to avoid code conflicts
    });

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

  async create(data: any, createdBy: number): Promise<Employee> {
    try {
      console.log('=== Creating Employee ===');
      console.log('Input data:', JSON.stringify(data, null, 2));
      console.log('Created by user ID:', createdBy);

      const employee = new Employee();

      // Assign data first (excluding employeeCode)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
      const { employeeCode: _employeeCode, ...employeeData } = data;
      Object.assign(employee, employeeData);

      console.log('Employee after data assignment:', employee);

      // Auto-generate employee code (this ensures it won't be overwritten)
      employee.employeeCode = await this.generateEmployeeCode();

      console.log('Generated employee code:', employee.employeeCode);

      employee.createdBy = createdBy;
      employee.updatedBy = createdBy;

      console.log('Employee before save:', employee);

      const result = await this.employeeRepository.save(employee);
      console.log('Employee created successfully with ID:', result.id);
      return result;
    } catch (error) {
      console.error('=== Error Creating Employee ===');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.error('Error message:', error.message);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.error('Error stack:', error.stack);
      console.error('Error details:', error);
      throw error;
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

  async update(id: number, data: any, updatedBy: number): Promise<Employee> {
    const employee = await this.findOne(id);
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
