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
    const backPath = isClassPayment ? '/classes' : '/payments';
    const isVerified = isClassPayment
      ? this.classSchedulesService.verifySecureHash(query)
      : this.vnpayService.verifySecureHash(query);

    if (!isVerified) {
      return res.send(
        this.renderReturnPage(
          '❌ Lỗi bảo mật',
          'Chữ ký không hợp lệ, không thể xác nhận giao dịch.',
          backPath,
        ),
      );
    }

    if (query.vnp_ResponseCode === '00') {
      const message = isClassPayment
        ? 'Quay lại trang Lớp học để tham gia khi buổi học bắt đầu.'
        : 'Bàn ăn đã được giải phóng.';
      return res.send(this.renderReturnPage('🎉 Thanh toán thành công!', message, backPath));
    } else {
      return res.send(
        this.renderReturnPage(
          '⚠️ Thanh toán thất bại hoặc đã hủy',
          `Mã lỗi: ${query.vnp_ResponseCode}`,
          backPath,
        ),
      );
    }
  }

  private renderReturnPage(title: string, message: string, backPath: string): string {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta http-equiv="refresh" content="3;url=${backPath}" />
<title>${title}</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0c0b09; color:#f3ead9; font-family:'Segoe UI',Arial,sans-serif; }
  .card { max-width:420px; margin:20px; padding:34px; border-radius:22px; border:1px solid rgba(201,166,86,0.18); background:rgba(255,255,255,0.05); text-align:center; }
  h1 { margin:0 0 12px; font-size:1.5rem; }
  p { margin:0 0 22px; color:#ad9d82; line-height:1.55; }
  a { display:inline-flex; padding:13px 20px; border-radius:13px; background:#7d6330; color:white; text-decoration:none; font-weight:700; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${backPath}">Quay lại ứng dụng</a>
  </div>
</body>
</html>`;
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
