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

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
