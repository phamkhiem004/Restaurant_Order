import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { Between, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from 'src/menu-items/entities/menu_item.entity';
import { OrderItemStatus, UpdateOrderItemStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { DiningTable } from 'src/dining-tables/entities/dining-table.entity';
import { AddItemsToOrderDto } from './dto/add-items-to-order.dto';
import { UpdateItemQuantityDto } from './dto/update-item-quantity.dto';

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
          status: In(['PENDING', 'CONFIRMED']),
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

  async addItemsToOrder(orderId: number, dto: AddItemsToOrderDto) {
    const { items } = dto;

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại!`);
    }

    if (order.status === 'BILLED' || order.status === 'PAID') {
      throw new BadRequestException(
        `Đơn hàng đang ở trạng thái ${order.status}, không thể gọi thêm món!`
      );
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

    const orderItemsPromises = validMenuItems.map((item) => {
      let finalPrice = item.dbData.price; 
      if (item.dbData.is_flash_sale === true && item.dbData.sale_price !== null) {
        finalPrice = item.dbData.sale_price; 
      }

      return this.orderItemRepository.create({
        orderId: order.id,        
        menuItemId: item.dbData.id,   
        quantity: item.dtoQuantity,       
        priceAtTime: finalPrice,
        status: 'PENDING' 
      });
    });

    const newOrderItems = await Promise.all(orderItemsPromises);
    await this.orderItemRepository.save(newOrderItems);

    const { sum } = await this.orderItemRepository
      .createQueryBuilder('item')
      .select('SUM(item.priceAtTime * item.quantity)', 'sum')
      .where('item.orderId = :orderId', { orderId: order.id })
      .andWhere('item.status != :status', { status: 'CANCELLED' })
      .getRawOne();


    order.totalAmount = sum ? Number(sum) : 0;
    if (order.status === 'SERVED') {
      order.status = 'PREPARING';
    }
    await this.orderRepository.save(order);

    return {
      message: 'Gọi thêm các món mới vào đơn hàng thành công!',
      orderStatus: order.status,
      newTotalAmount: order.totalAmount,
      addedItems: newOrderItems
    };
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

  const activeItems = allItemsInOrder.filter(item => item.status !== 'CANCELLED');

  const isAllActiveDone = activeItems.length > 0 && activeItems.every(item => item.status === 'DONE');

  if (isAllActiveDone && parentOrder.status !== 'SERVED') {
    parentOrder.status = 'SERVED';
    isOrderUpdated = true;
  }
  
  if (activeItems.length === 0) {
    parentOrder.status = 'NEW';
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

async updateItemQuantity(orderId: number, itemId: number, dto: UpdateItemQuantityDto) {
    const { quantity } = dto;


    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại!`);
    
    if (order.status === 'BILLED' || order.status === 'PAID') {
      throw new BadRequestException(`Đơn hàng đã chốt hóa đơn hoặc thanh toán, không thể sửa số lượng!`);
    }

    const orderItem = await this.orderItemRepository.findOne({ where: { id: itemId, orderId } });
    if (!orderItem) throw new NotFoundException(`Không tìm thấy dòng món ăn #${itemId} trong đơn hàng này!`);

    if (orderItem.status !== 'PENDING') {
      throw new BadRequestException(
        `Không thể sửa số lượng! Món ăn này đang ở trạng thái '${orderItem.status}' (Bếp đang làm hoặc đã làm xong).`
      );
    }


    orderItem.quantity = quantity;
    await this.orderItemRepository.save(orderItem);

    const { sum } = await this.orderItemRepository
      .createQueryBuilder('item')
      .select('SUM(item.priceAtTime * item.quantity)', 'sum')
      .where('item.orderId = :orderId', { orderId: orderId })
      .andWhere('item.status != :status', { status: 'CANCELLED' })
      .getRawOne();

    order.totalAmount = sum ? Number(sum) : 0;
    await this.orderRepository.save(order);

    return {
      message: 'Cập nhật số lượng món ăn thành công!',
      updatedItem: {
        id: orderItem.id,
        menuItemId: orderItem.menuItemId,
        newQuantity: orderItem.quantity
      },
      newTotalAmount: order.totalAmount
    };
  }

  async cancelOrderItem(orderId: number, itemId: number) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại!`);
    
    if (order.status === 'BILLED' || order.status === 'PAID') {
      throw new BadRequestException(`Đơn hàng đã chốt bill hoặc thanh toán, không thể hủy món!`);
    }

    const orderItem = await this.orderItemRepository.findOne({ where: { id: itemId, orderId } });
    if (!orderItem) throw new NotFoundException(`Không tìm thấy dòng món ăn #${itemId} trong đơn hàng này!`);

    if (orderItem.status === 'CANCELLED') {
      throw new BadRequestException(`Món ăn này vốn đã ở trạng thái hủy từ trước!`);
    }
    if (orderItem.status === 'COOKING' || orderItem.status === 'DONE') {
      throw new BadRequestException(
        `Bếp đang chế biến hoặc đã nấu xong món này ('${orderItem.status}'). Bạn không thể tự ý hủy, vui lòng gọi Quản lý!`
      );
    }

    orderItem.status = 'CANCELLED' as any;
    await this.orderItemRepository.save(orderItem);


    const { sum } = await this.orderItemRepository
      .createQueryBuilder('item')
      .select('SUM(item.priceAtTime * item.quantity)', 'sum')
      .where('item.orderId = :orderId', { orderId: orderId })
      .andWhere('item.status != :status', { status: 'CANCELLED' })
      .getRawOne();

    order.totalAmount = sum ? Number(sum) : 0;

    const allItemsInOrder = await this.orderItemRepository.find({
      where: { orderId: order.id }
    });
    
    const activeItems = allItemsInOrder.filter(item => item.status !== 'CANCELLED');

    if (activeItems.length === 0) {
      order.status = 'NEW'; 
    } else {
      const isAllActiveDone = activeItems.every(item => item.status === 'DONE');
      if (isAllActiveDone && order.status !== 'SERVED') {
        order.status = 'SERVED';
      }
    }

    await this.orderRepository.save(order);

    return {
      message: 'Hủy món ăn thành công (Đã chuyển trạng thái sang CANCELLED)!',
      cancelledItemId: orderItem.id,
      orderStatus: order.status,
      newTotalAmount: order.totalAmount
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
