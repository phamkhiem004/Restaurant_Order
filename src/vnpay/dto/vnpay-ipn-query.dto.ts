import { IsNotEmpty, IsString } from 'class-validator';

export class VnpayIpnQueryDto {
  @IsNotEmpty()
  @IsString()
  vnp_TxnRef: string;

  @IsNotEmpty()
  @IsString()
  vnp_Amount: string;

  @IsNotEmpty()
  @IsString()
  vnp_ResponseCode: string;

  @IsNotEmpty()
  @IsString()
  vnp_TransactionNo: string;

  @IsNotEmpty()
  @IsString()
  vnp_SecureHash: string;

  [key: string]: any;
}