import { Controller, Get, Req, Res, Query } from '@nestjs/common';
import { VnpayService } from './vnpay.service';
import express from 'express';
import { CreateVnpayUrlDto } from './dto/create-vnpay-url.dto';

@Controller('vnpay')
export class VnpayController {
  constructor(private readonly vnpayService: VnpayService) {}



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
    const isVerified = this.vnpayService.verifySecureHash(query);
    
    if (!isVerified) {
      return res.send('<h1>❌ Lỗi bảo mật: Chữ ký không hợp lệ!</h1>');
    }

    if (query.vnp_ResponseCode === '00') {
      return res.send('<h1>🎉 Thanh toán thành công! Bàn ăn đã được giải phóng.</h1>');
    } else {
      return res.send(`<h1>⚠️ Thanh toán thất bại hoặc đã hủy (Mã lỗi: ${query.vnp_ResponseCode})</h1>`);
    }
  }


  @Get('vnpay-ipn')
  async vnpayIpn(@Query() query: any) { 
    try {
      return await this.vnpayService.handleIpn(query);
    } catch (error) {
      console.error('IPN Error:', error);
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }
}
