import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-status.dto';
import { AddItemsToOrderDto } from './dto/add-items-to-order.dto';
import { UpdateItemQuantityDto } from './dto/update-item-quantity.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }
  @Post(':id/add-items')
  async addItems(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() addItemsDto: AddItemsToOrderDto
  ) {
    return await this.ordersService.addItemsToOrder(orderId, addItemsDto);
  }

  @Get('/order')
  findAllOrders() {
    return this.ordersService.findAllOrders();
  }

  @Get('/order-item')
  findAllOrderItems() {
    return this.ordersService.findAllOrderItems();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }
  @Patch('/items/:itemId/status')
  async updateItemStatus(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateDto: UpdateOrderItemStatusDto
  ) {
    return this.ordersService.updateItemStatus(itemId, updateDto);
  }
  @Patch(':orderId/items/:itemId/quantity')
  async updateQuantity(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateDto: UpdateItemQuantityDto
  ) {
    return await this.ordersService.updateItemQuantity(orderId, itemId, updateDto);
  }

  @Patch(':orderId/items/:itemId/cancel')
  async cancelItem(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number
  ) {
    return await this.ordersService.cancelOrderItem(orderId, itemId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
