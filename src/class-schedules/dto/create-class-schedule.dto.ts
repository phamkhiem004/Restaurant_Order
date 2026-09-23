import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateClassScheduleDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên buổi học không được để trống' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'Thời gian bắt đầu không được để trống' })
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(15, { message: 'Thời lượng tối thiểu là 15 phút' })
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Giá buổi học phải lớn hơn hoặc bằng 0' })
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Sức chứa phải lớn hơn hoặc bằng 1' })
  capacity?: number;
}
