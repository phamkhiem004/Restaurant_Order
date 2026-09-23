import { Controller, Get, Req, Res, Query } from '@nestjs/common';
import { VnpayService } from './vnpay.service';
import express from 'express';
import { CreateVnpayUrlDto } from './dto/create-vnpay-url.dto';
import { ClassSchedulesService } from '../class-schedules/class-schedules.service';

@Controller('vnpay')
export class VnpayController {
  constructor(
    private readonly vnpayService: VnpayService,
    private readonly classSchedulesService: ClassSchedulesService,
  ) {}



  @Get('create-payment-url')
  async createPaymentUrl(
    @Req() req: express.Request,
    @Query() queryDto: CreateVnpayUrlDto 
  ) {
    const paymentUrl = await this.vnpayService.createPaymentUrl(req, queryDto.orderId);
    
    return {
      message: 'Tạo URL thanh toán thành công',
      url: paymentUrl
    };
  }

  @Get('vnpay-return')
  vnpayReturn(@Query() query: any, @Res() res: express.Response) {
    const isClassPayment =
      typeof query.vnp_TxnRef === 'string' &&
      query.vnp_TxnRef.startsWith('class_');
    const isVerified = isClassPayment
      ? this.classSchedulesService.verifySecureHash(query)
      : this.vnpayService.verifySecureHash(query);

    if (!isVerified) {
      return res.send('<h1>❌ Lỗi bảo mật: Chữ ký không hợp lệ!</h1>');
    }

    if (query.vnp_ResponseCode === '00') {
      const successMessage = isClassPayment
        ? '<h1>🎉 Thanh toán thành công! Quay lại trang Lớp học để tham gia khi buổi học bắt đầu.</h1>'
        : '<h1>🎉 Thanh toán thành công! Bàn ăn đã được giải phóng.</h1>';
      return res.send(successMessage);
    } else {
      return res.send(`<h1>⚠️ Thanh toán thất bại hoặc đã hủy (Mã lỗi: ${query.vnp_ResponseCode})</h1>`);
    }
  }


  @Get('vnpay-ipn')
  async vnpayIpn(@Query() query: any) {
    try {
      const isClassPayment =
        typeof query.vnp_TxnRef === 'string' &&
        query.vnp_TxnRef.startsWith('class_');
      if (isClassPayment) {
        return await this.classSchedulesService.handleIpn(query);
      }
      return await this.vnpayService.handleIpn(query);
    } catch (error) {
      console.error('IPN Error:', error);
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }
}
