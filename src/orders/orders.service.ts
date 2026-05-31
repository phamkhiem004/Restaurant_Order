import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderItem } from './entities/order-item.entity';
import { MenuItem } from 'src/menu-items/entities/menu_item.entity';

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
  const { tableId, note, items } = createOrderDto;

  // ==========================================
  // BƯỚC 1: TRẠM KIỂM SOÁT (VALIDATION)
  // ==========================================
  // Tạo một mảng tạm để chứa các thông tin món ăn tìm được từ DB
  // Định nghĩa rõ: Đây là một mảng chứa các Object, 
// mỗi Object có 2 thuộc tính là dtoQuantity (số) và dbData (kiểu MenuItem)
const validMenuItems: { dtoQuantity: number; dbData: MenuItem }[] = [];

  for (const item of items) {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id: item.menuItemId }
    });

    // Nếu phát hiện 1 món không tồn tại, NÉM LỖI NGAY LẬP TỨC!
    // Lúc này Order gốc chưa hề được tạo, DB hoàn toàn sạch sẽ.
    if (!menuItem) {
      throw new NotFoundException(`Món ăn ID ${item.menuItemId} không tồn tại!`);
    }

    // Nếu hợp lệ, cất vào mảng tạm để lát nữa dùng tính tiền
    validMenuItems.push({
      dtoQuantity: item.quantity,
      dbData: menuItem
    });
  }

  // ==========================================
  // BƯỚC 2: MỌI THỨ HỢP LỆ -> TẠO ORDER GỐC
  // ==========================================
  const newOrder = this.orderRepository.create({ tableId, note: note });
  const savedOrder = await this.orderRepository.save(newOrder); 

  // ==========================================
  // BƯỚC 3: TẠO ORDER ITEMS 
  // ==========================================
  const orderItemsPromises = validMenuItems.map((item) => {
    let finalPrice = item.dbData.price; 

    // Tính giá sale nếu có
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

  // ==========================================
  // BƯỚC 4: BẤM MÁY TÍNH & CẬP NHẬT TỔNG TIỀN
  // ==========================================
  const calculatedTotal = orderItems.reduce((sum, item) => {
    return sum + (Number(item.priceAtTime) * item.quantity);
  }, 0);

  savedOrder.totalAmount = calculatedTotal;
  await this.orderRepository.save(savedOrder);

  // ==========================================
  // BƯỚC 5: TRẢ VỀ KẾT QUẢ
  // ==========================================
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

  update(id: number, updateOrderDto: UpdateOrderDto) {
    console.log(updateOrderDto);
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
