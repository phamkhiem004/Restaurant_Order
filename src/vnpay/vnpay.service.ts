import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateVnpayDto } from './dto/create-vnpay.dto';
import { UpdateVnpayDto } from './dto/update-vnpay.dto';
import moment from 'moment';
import * as qs from 'qs';
import * as crypto from 'crypto';
import { PaymentsService } from '../payments/payments.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VnpayService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  private get vnp_TmnCode(): string {
    return this.configService.getOrThrow<string>('VNP_TMN_CODE');
  }

  private get vnp_HashSecret(): string {
    return this.configService.getOrThrow<string>('VNP_HASH_SECRET');
  }

  private get vnp_Url(): string {
    return this.configService.get<string>(
      'VNP_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
  }

  private get vnp_ReturnUrl(): string {
    return this.configService.getOrThrow<string>('VNP_RETURN_URL');
  }

  async createPaymentUrl(req: any, orderId: number): Promise<string> {
    const date = new Date();
    const createDate = moment(date).format('YYYYMMDDHHmmss');

    const txnRef = `${orderId}_${date.getTime()}`;

    const amountFromDb = await this.paymentsService.createPendingPayment({
      orderId: orderId,
      amount: '0',
      vnpTxnRef: txnRef,
      paymentMethod: 'VNPAY',
    });

    const ipAddr =
      req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    let vnp_Params: Record<string, any> = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = this.vnp_TmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = txnRef;
    vnp_Params['vnp_OrderInfo'] =
      `Thanh toan don hang nha hang POS #${orderId}`;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount'] = amountFromDb * 100;
    vnp_Params['vnp_ReturnUrl'] = this.vnp_ReturnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;

    vnp_Params = this.sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;

    return this.vnp_Url + '?' + qs.stringify(vnp_Params, { encode: false });
  }

  verifySecureHash(query: any): boolean {
    const vnp_SecureHash = query['vnp_SecureHash'];

    let vnp_Params = { ...query };
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = this.sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return signed === vnp_SecureHash;
  }

  async handleIpn(query: any) {
    const isVerified = this.verifySecureHash(query);
    if (!isVerified) {
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    return await this.paymentsService.processPaymentResult(
      query.vnp_TxnRef,
      query.vnp_TransactionNo,
      query.vnp_ResponseCode,
    );
  }

  private sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys: string[] = [];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys.push(encodeURIComponent(key));
      }
    }

    keys.sort();

    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i];
      sorted[currentKey] = encodeURIComponent(obj[currentKey]).replace(
        /%20/g,
        '+',
      );
    }

    return sorted;
  }
}
