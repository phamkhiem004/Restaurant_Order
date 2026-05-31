import { IsInt, IsNotEmpty, IsDateString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsNotEmpty()
  @IsInt()
  userId: number;


  @IsNotEmpty()
  @IsInt()
  tableId: number;


  @IsNotEmpty()
  @IsDateString()
  reservationTime: string;


  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: 'Số lượng khách ít nhất phải là 1' })
  guestCount: number;

  notes?: string;
}
