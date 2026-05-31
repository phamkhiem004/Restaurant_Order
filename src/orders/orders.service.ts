import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from 'src/menu-items/entities/menu_item.entity';
import { OrderItemStatus, UpdateOrderItemStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
  const { tableId, note, items, reservationId } = createOrderDto;

const validMenuItems: { dtoQuantity: number; dbData: MenuItem }[] = [];

  for (const item of items) {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id: item.menuItemId }
    });
    if (!menuItem) {
      throw new NotFoundException(`Món ăn ID ${item.menuItemId} không tồn tại!`);
    }

    validMenuItems.push({
      dtoQuantity: item.quantity,
      dbData: menuItem
    });
  }

  const newOrder = this.orderRepository.create({ tableId, note: note, reservationId: reservationId || null });
  const savedOrder = await this.orderRepository.save(newOrder); 

  const orderItemsPromises = validMenuItems.map((item) => {
    let finalPrice = item.dbData.price; 
    if (item.dbData.is_flash_sale === true && item.dbData.sale_price !== null) {
      finalPrice = item.dbData.sale_price; 
    }

    return this.orderItemRepository.create({
      orderId: savedOrder.id,        
      menuItemId: item.dbData.id,   
      quantity: item.dtoQuantity,       
      priceAtTime: finalPrice,
      status: 'PENDING'              
    });
  });

  const orderItems = await Promise.all(orderItemsPromises);
  await this.orderItemRepository.save(orderItems);

  const calculatedTotal = orderItems.reduce((sum, item) => {
    return sum + (Number(item.priceAtTime) * item.quantity);
  }, 0);

  savedOrder.totalAmount = calculatedTotal;
  await this.orderRepository.save(savedOrder);

  return {
    message: 'Tạo đơn hàng thành công!',
    order: savedOrder,
    items: orderItems
  };
}

  findAllOrders() {
    return this.orderRepository.find();
  }

  findAllOrderItems() {
    return this.orderItemRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  async updateItemStatus(itemId: number, updateDto: UpdateOrderItemStatusDto) {
  const { status } = updateDto;

  const orderItem = await this.orderItemRepository.findOne({
    where: { id: itemId },
    relations:{ 'order': true }
  });

  if (!orderItem) {
    throw new NotFoundException(`Không tìm thấy món ăn với ID ${itemId}`);
  }

  orderItem.status = status;
  await this.orderItemRepository.save(orderItem);

  const parentOrder = orderItem.order;
  let isOrderUpdated = false;

  if (status === OrderItemStatus.COOKING && parentOrder.status === 'NEW') {
    parentOrder.status = 'PREPARING';
    isOrderUpdated = true;
  }


  if (status === OrderItemStatus.DONE) {
    const allItemsInOrder = await this.orderItemRepository.find({
      where: { orderId: parentOrder.id }
    });

    const isAllDone = allItemsInOrder.every(item => item.status === 'DONE');

    if (isAllDone && parentOrder.status !== 'SERVED') {
      parentOrder.status = 'SERVED';
      isOrderUpdated = true;
    }
  }

  if (isOrderUpdated) {
    await this.orderRepository.save(parentOrder);
  }

  return {
    message: `Đã cập nhật món ăn thành ${status}`,
    orderItem: {
      id: orderItem.id,
      menuItemId: orderItem.menuItemId,
      status: orderItem.status
    },
    orderStatus: parentOrder.status 
  };
}


  update(id: number, updateOrderDto: UpdateOrderDto) {
      console.log(updateOrderDto);
      return `This action updates a #${id} order`;
    }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
