import { IsEnum, IsNotEmpty } from 'class-validator';

// Định nghĩa các trạng thái hợp lệ của bếp
export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export class UpdateReservationStatusDto {
  @IsNotEmpty()
  @IsEnum(ReservationStatus, { message: 'Trạng thái không hợp lệ. Chỉ chấp nhận PENDING, CONFIRMED, CANCELLED hoặc COMPLETED.' })
  status: ReservationStatus;
}