import { IsNotEmpty, IsNumber, IsString, IsEnum } from 'class-validator';

export class CreatePaymentRecordDto {
  @IsNotEmpty()
  @IsNumber()
  orderId: number;

  @IsNotEmpty()
  @IsString()
  amount: string;

  @IsNotEmpty()
  @IsString()
  vnpTxnRef: string;

 @IsNotEmpty()
  @IsEnum(['VNPAY', 'MOMO', 'CASH'], { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod: string;
}