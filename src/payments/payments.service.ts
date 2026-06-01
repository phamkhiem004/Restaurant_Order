import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DiningTable } from 'src/dining-tables/entities/dining-table.entity';
import { Order } from 'src/orders/entities/order.entity';
import { CreatePaymentRecordDto } from './dto/create-payment-record.dto';

@Injectable()
export class PaymentsService {

  constructor(
    @InjectRepository(Payment) private paymentRepository: Repository<Payment>,
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(DiningTable) private tableRepository: Repository<DiningTable>,
  ) {}

  async createPendingPayment(dto: CreatePaymentRecordDto): Promise<number> {
    const order = await this.orderRepository.findOne({ 
      where: { id: dto.orderId } 
    });
    
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${dto.orderId}`);
    }
    if (order.status === 'PAID') {
      throw new BadRequestException('Đơn hàng này đã được thanh toán trước đó');
    }
    if (order.status === 'NEW'|| order.status === 'PREPARING') {
      throw new BadRequestException('Đơn hàng chưa được phục vụ, không thể thanh toán');
    }

    order.status = 'BILLED' as any;
    await this.orderRepository.save(order);

    const finalAmount = Math.round(Number(order.totalAmount));

    const paymentLog = this.paymentRepository.create({
      orderId: order.id,                         
      paymentMethod: dto.paymentMethod as any, 
      amount: finalAmount.toString(),        
      status: 'PENDING' as any,
      vnpTxnRef: dto.vnpTxnRef,
    });
    
    await this.paymentRepository.save(paymentLog);
    
    return finalAmount; 
  }

  async processPaymentResult(txnRef: string, transactionNo: string, responseCode: string) {
    const payment = await this.paymentRepository.findOne({
      where: { vnpTxnRef: txnRef }
    });

    if (!payment) return { RspCode: '01', Message: 'Order not found' };
    if (payment.status !== 'PENDING') return { RspCode: '02', Message: 'Order already confirmed' };

    const order = await this.orderRepository.findOne({
      where: { id: payment.orderId }
    });

    if (responseCode === '00') {
      payment.status = 'SUCCESS';
      payment.transactionId = transactionNo; 
      await this.paymentRepository.save(payment);

      if (order) {
        order.status = 'PAID' as any;
        await this.orderRepository.save(order);

        const tableId = (order as any).tableId; 
        if (tableId) {
          const table = await this.tableRepository.findOne({ where: { id: tableId } });
          if (table) {
            table.status = 'AVAILABLE' as any;
            await this.tableRepository.save(table);
          }
        }
      }
    } else {
      payment.status = 'FAILED';
      payment.transactionId = transactionNo;
      await this.paymentRepository.save(payment);

      if (order) {
        order.status = 'SERVED' as any; 
        await this.orderRepository.save(order);
      }
    }

    return { RspCode: '00', Message: 'Confirm success' };
  }
  create(createPaymentDto: CreatePaymentDto) {
    console.log(createPaymentDto);
    return 'This action adds a new payment';
  }

  findAll() {
    return `This action returns all payments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    console.log(updatePaymentDto);
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
