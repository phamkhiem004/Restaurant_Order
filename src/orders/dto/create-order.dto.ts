import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsInt()
  @IsNotEmpty()
  menuItemId: number;

  @IsInt()
  @Min(1, { message: 'Số lượng món ăn phải lớn hơn hoặc bằng 1' }) 
  quantity: number;
}

export class CreateOrderDto {
  @IsInt()
  @IsNotEmpty()
  tableId: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  reservationId?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 món ăn' }) 
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}