import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { Between, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from 'src/menu-items/entities/menu_item.entity';
import { OrderItemStatus, UpdateOrderItemStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { DiningTable } from 'src/dining-tables/entities/dining-table.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
    @InjectRepository(DiningTable)
    private diningTableRepository: Repository<DiningTable>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
  const { tableId, note, items, reservationId } = createOrderDto;

  const table = await this.diningTableRepository.findOne({ where: { id: tableId } });
    if (!table) {
      throw new NotFoundException(`Bàn ID ${tableId} không tồn tại!`);
    }

    if (table.status !== 'AVAILABLE') {
      throw new BadRequestException(`Bàn ID ${tableId} hiện không trống (Đang ở trạng thái ${table.status})!`);
    }

    if (reservationId) {
    const reservation = await this.reservationRepository.findOne({ where: { id: reservationId } });
    
    if (!reservation) {
      throw new NotFoundException(`Đơn đặt bàn ID ${reservationId} không tồn tại!`);
    }

    if (reservation.tableId !== tableId) {
      throw new BadRequestException(
        `Sai thông tin! Đơn đặt bàn ID ${reservationId} là của Bàn ID ${reservation.tableId}, không phải của Bàn ID ${tableId}.`
      );
    }

    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'PENDING') {
      throw new BadRequestException(
        `Không thể sử dụng Đơn đặt bàn ID ${reservationId} vì nó đang ở trạng thái '${reservation.status}'!`
      );
    }
  }
    


    if (!reservationId) {
      const now = new Date();
      const nextTwoHours = new Date(now.getTime() + 2 * 60 * 60000); 

      const upcomingReservation = await this.reservationRepository.findOne({
        where: {
          tableId: tableId,
          status: 'CONFIRMED',
          reservationTime: Between(now, nextTwoHours),
        },
      });

      if (upcomingReservation) {
        throw new BadRequestException(
          `Không thể mở bàn! Bàn này đã có người đặt trước vào lúc ${upcomingReservation.reservationTime.toISOString()}.`
        );
      }
    }

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

  await this.diningTableRepository.update(tableId, { status: 'OCCUPIED' as any }); 
   
    if (reservationId) {
      await this.reservationRepository.update(reservationId, { status: 'COMPLETED' as any });
    }

  return {
    message: 'Tạo đơn hàng thành công và đã khóa bàn sang trạng thái OCCUPIED!',
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
