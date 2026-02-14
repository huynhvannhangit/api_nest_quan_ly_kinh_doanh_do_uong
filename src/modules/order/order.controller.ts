import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ActionLog({
    action: 'CREATE_ORDER',
    module: 'ORDER',
    description: 'Tạo đơn hàng mới',
  })
  create(@Body() data: CreateOrderDto, @GetCurrentUserId() userId: number) {
    return this.orderService.create(data, userId);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id);
  }

  @Patch(':id/status')
  @ActionLog({
    action: 'UPDATE_ORDER_STATUS',
    module: 'ORDER',
    description: 'Cập nhật trạng thái đơn hàng',
  })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @GetCurrentUserId() userId: number,
  ) {
    return this.orderService.updateStatus(+id, status, userId);
  }

  @Delete(':id')
  @ActionLog({
    action: 'DELETE_ORDER',
    module: 'ORDER',
    description: 'Xóa đơn hàng',
  })
  remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.orderService.remove(+id, userId);
  }
}
