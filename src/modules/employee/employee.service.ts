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

  async create(data: any, createdBy: number): Promise<Employee> {
    const employee = new Employee();
    Object.assign(employee, data);
    employee.createdBy = createdBy;
    employee.updatedBy = createdBy;
    return this.employeeRepository.save(employee);
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
