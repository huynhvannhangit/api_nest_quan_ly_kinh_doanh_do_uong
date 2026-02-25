import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Permissions(Permission.EMPLOYEE_CREATE)
  @ActionLog({
    action: 'CREATE_EMPLOYEE',
    module: 'EMPLOYEE',
    description: 'Thêm mới nhân viên',
  })
  create(@Body() data: CreateEmployeeDto, @GetCurrentUserId() userId: number) {
    return this.employeeService.create(data, userId);
  }

  @Get('available-users')
  @Permissions(Permission.EMPLOYEE_VIEW)
  getAvailableUsers(@Query('excludeEmployeeId') excludeEmployeeId?: string) {
    return this.employeeService.getAvailableUsers(
      excludeEmployeeId ? +excludeEmployeeId : undefined,
    );
  }

  @Get()
  @Permissions(Permission.EMPLOYEE_VIEW)
  findAll() {
    return this.employeeService.findAll();
  }

  @Get(':id')
  @Permissions(Permission.EMPLOYEE_VIEW)
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(+id);
  }

  @Patch(':id')
  @Permissions(Permission.EMPLOYEE_UPDATE)
  @ActionLog({
    action: 'UPDATE_EMPLOYEE',
    module: 'EMPLOYEE',
    description: 'Cập nhật thông tin nhân viên',
  })
  update(
    @Param('id') id: string,
    @Body() data: UpdateEmployeeDto & { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    const { reason, ...employeeData } = data;
    return this.employeeService.update(
      +id,
      employeeData as UpdateEmployeeDto,
      userId,
      reason,
    );
  }

  @Delete(':id')
  @Permissions(Permission.EMPLOYEE_DELETE)
  @ActionLog({
    action: 'DELETE_EMPLOYEE',
    module: 'EMPLOYEE',
    description: 'Xóa nhân viên',
  })
  remove(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.employeeService.remove(+id, userId, body?.reason);
  }
}
