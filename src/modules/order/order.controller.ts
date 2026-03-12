import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderStatus } from './entities/order.entity';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { ActionLog } from '../../core/decorators/action-log.decorator';
import { GetCurrentUserId } from '../../core/decorators/get-current-user-id.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { Permission } from '../../common/enums/permission.enum';

@Controller('order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(201)
  @Permissions(Permission.ORDER_CREATE)
  @ActionLog({
    action: 'CREATE_ORDER',
    module: 'ORDER',
    description: 'Tạo đơn hàng mới',
  })
  create(@Body() data: CreateOrderDto, @GetCurrentUserId() userId: number) {
    return this.orderService.create(data, userId);
  }

  @Get()
  @HttpCode(200)
  @Permissions(Permission.ORDER_VIEW_ALL)
  findAll() {
    return this.orderService.findAll();
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Permissions(Permission.ORDER_CANCEL)
  @ActionLog({
    action: 'CANCEL_ORDER',
    module: 'ORDER',
    description: 'Huỷ đơn hàng',
  })
  cancel(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.orderService.cancel(+id, userId);
  }

  @Get('active/table/:tableId')
  @HttpCode(200)
  @Permissions(Permission.ORDER_VIEW_ID)
  findActiveByTable(@Param('tableId') tableId: string) {
    return this.orderService.findActiveByTable(+tableId);
  }

  @Get(':id')
  @HttpCode(200)
  @Permissions(Permission.ORDER_VIEW_ID)
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id);
  }

  @Patch(':id/status')
  @HttpCode(200)
  @Permissions(Permission.ORDER_UPDATE)
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
  @HttpCode(200)
  @Permissions(Permission.ORDER_UPDATE)
  @ActionLog({
    action: 'ADD_ORDER_ITEMS',
    module: 'ORDER',
    description: 'Thêm món vào đơn hàng hiện tại',
  })
  addItems(
    @Param('id') id: string,
    @Body('items') items: CreateOrderItemDto[],
    @Body('notes') notes: string,
    @GetCurrentUserId() userId: number,
  ) {
    return this.orderService.addItems(+id, items, userId, notes);
  }

  @Post(':id/transfer-table')
  @HttpCode(200)
  @Permissions(Permission.ORDER_UPDATE)
  @ActionLog({
    action: 'TRANSFER_TABLE',
    module: 'ORDER',
    description: 'Chuyển bàn cho đơn hàng',
  })
  transferTable(
    @Param('id') id: string,
    @Body('targetTableId') targetTableId: number,
    @GetCurrentUserId() userId: number,
  ) {
    return this.orderService.transferTable(+id, targetTableId, userId);
  }

  @Post(':id/merge-order')
  @HttpCode(200)
  @Permissions(Permission.ORDER_UPDATE)
  @ActionLog({
    action: 'MERGE_ORDER',
    module: 'ORDER',
    description: 'Gộp đơn hàng',
  })
  mergeOrder(
    @Param('id') id: string,
    @Body('targetTableId') targetTableId: number,
    @GetCurrentUserId() userId: number,
  ) {
    return this.orderService.mergeOrder(+id, targetTableId, userId);
  }

  @Delete(':id')
  @HttpCode(200)
  @Permissions(Permission.ORDER_DELETE)
  @ActionLog({
    action: 'DELETE_ORDER',
    module: 'ORDER',
    description: 'Xóa đơn hàng',
  })
  remove(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.orderService.remove(+id, userId);
  }

  @Delete(':id/items/:productId')
  @HttpCode(200)
  @Permissions(Permission.ORDER_UPDATE)
  @ActionLog({
    action: 'REMOVE_ORDER_ITEM',
    module: 'ORDER',
    description: 'Xoá món khỏi đơn hàng',
  })
  removeItem(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @GetCurrentUserId() userId: number,
  ) {
    return this.orderService.removeItem(+id, +productId, userId);
  }
}
