import { IsNotEmpty, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVnpayUrlDto {
  @IsNotEmpty({ message: 'Mã đơn hàng (orderId) không được để trống' })
  @IsInt({ message: 'Mã đơn hàng phải là số nguyên' })
  @Min(1, { message: 'Mã đơn hàng không hợp lệ' })
  @Type(() => Number)
  orderId: number;
}