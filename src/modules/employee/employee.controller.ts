// cspell:disable
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeStatus } from './entities/employee.entity';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @HttpCode(201)
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
  @HttpCode(200)
  @Permissions(Permission.EMPLOYEE_VIEW)
  getAvailableUsers(@Query('excludeEmployeeId') excludeEmployeeId?: string) {
    return this.employeeService.getAvailableUsers(
      excludeEmployeeId ? +excludeEmployeeId : undefined,
    );
  }

  @Get()
  @HttpCode(200)
  @Permissions(Permission.EMPLOYEE_VIEW)
  findAll(@Query('keyword') keyword?: string) {
    return this.employeeService.findAll(keyword);
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.EMPLOYEE_VIEW)
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(200)
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

  @Patch(':id/status')
  @HttpCode(200)
  @Permissions(Permission.EMPLOYEE_UPDATE)
  @ActionLog({
    action: 'UPDATE_EMPLOYEE_STATUS',
    module: 'EMPLOYEE',
    description: 'Cập nhật trạng thái nhân viên (Đang làm/Nghỉ việc)',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: EmployeeStatus; reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.employeeService.updateEmployeeStatus(
      +id,
      body.status,
      userId,
      body.reason,
    );
  }

  @Delete('bulk')
  @HttpCode(200)
  @Permissions(Permission.EMPLOYEE_DELETE)
  @ActionLog({
    action: 'DELETE_EMPLOYEE_BULK',
    module: 'EMPLOYEE',
    description: 'Xóa hàng loạt nhân viên',
  })
  removeMany(
    @Body() body: { ids: number[]; reason?: string },
    @GetCurrentUserId() userId: number,
  ) {
    return this.employeeService.removeMany(body.ids, userId, body?.reason);
  }

  @Delete(':id')
  @HttpCode(200)
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
