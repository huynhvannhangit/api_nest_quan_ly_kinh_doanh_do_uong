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
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
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

  @Post(':id/cancel')
  @ActionLog({
    action: 'CANCEL_ORDER',
    module: 'ORDER',
    description: 'Huỷ đơn hàng',
  })
  cancel(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.orderService.cancel(+id, userId);
  }

  @Get('active/table/:tableId')
  findActiveByTable(@Param('tableId') tableId: string) {
    return this.orderService.findActiveByTable(+tableId);
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

  @Patch(':id/add-items')
  @ActionLog({
    action: 'ADD_ORDER_ITEMS',
    module: 'ORDER',
    description: 'Thêm món vào đơn hàng hiện tại',
  })
  addItems(
    @Param('id') id: string,
    @Body('items') items: CreateOrderItemDto[],
    @GetCurrentUserId() userId: number,
  ) {
    return this.orderService.addItems(+id, items, userId);
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
