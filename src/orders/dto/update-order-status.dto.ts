import { IsEnum, IsNotEmpty } from 'class-validator';

// Định nghĩa các trạng thái hợp lệ của bếp
export enum OrderItemStatus {
  PENDING = 'PENDING',
  COOKING = 'COOKING',
  DONE = 'DONE',
}

export class UpdateOrderItemStatusDto {
  @IsNotEmpty()
  @IsEnum(OrderItemStatus, { message: 'Trạng thái không hợp lệ. Chỉ chấp nhận PENDING, COOKING hoặc DONE.' })
  status: OrderItemStatus;
}